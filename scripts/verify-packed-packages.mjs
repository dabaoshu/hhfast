import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const artifactDir = join(repositoryRoot, 'artifacts', 'npm')
const consumerDir = join(tmpdir(), 'hhfast-package-consumer')
const fixtureDir = join(repositoryRoot, 'tests', 'package-consumer')
const pnpmCommand = process.env.HHFAST_PNPM ?? 'pnpm'
const pnpmCli = process.env.HHFAST_PNPM_CLI ?? process.env.npm_execpath
const childEnvironment = {
  ...process.env,
  PATH: `${dirname(process.execPath)};${process.env.PATH ?? ''}`,
}

function run(args, cwd = repositoryRoot, printOutput = true) {
  const command = pnpmCli ? process.execPath : pnpmCommand
  const commandArgs = pnpmCli ? [pnpmCli, ...args] : args
  const result = spawnSync(command, commandArgs, {
    cwd,
    env: childEnvironment,
    encoding: 'utf8',
    shell: !pnpmCli && process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (printOutput && result.stdout) process.stdout.write(result.stdout)
  if (printOutput && result.stderr) process.stderr.write(result.stderr)
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(' ')} failed with exit code ${result.status}\n${result.stderr}`)
  }
  return result.stdout.trim()
}

/**
 * 从 tarball 读取 package/package.json
 * @param {string} tarballPath
 */
function readTarballManifest(tarballPath) {
  const result = spawnSync('tar', ['-xOf', tarballPath, 'package/package.json'], {
    encoding: 'utf8',
    env: childEnvironment,
  })
  if (result.status !== 0) {
    throw new Error(`Failed to read package.json from ${tarballPath}\n${result.stderr}`)
  }
  return JSON.parse(result.stdout)
}

/**
 * 断言发布产物无 workspace 协议，且 UI 依赖已解析为 utils 真实版本
 * @param {string} tarballPath
 * @param {string} packageName
 */
function assertPublishedManifest(tarballPath, packageName) {
  const manifest = readTarballManifest(tarballPath)
  const dependencyBlocks = ['dependencies', 'optionalDependencies', 'peerDependencies']
  for (const block of dependencyBlocks) {
    const deps = manifest[block]
    if (!deps) continue
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === 'string' && version.includes('workspace:')) {
        throw new Error(`${packageName} tarball still contains ${block}.${name}=${version}`)
      }
    }
  }
  if (packageName === '@nnnb/hhfast-ui') {
    const utilsVersion = JSON.parse(
      readFileSync(join(repositoryRoot, 'packages/hhfast-utils/package.json'), 'utf8'),
    ).version
    const resolved = manifest.dependencies?.['@nnnb/hhfast-utils']
    if (resolved !== utilsVersion) {
      throw new Error(
        `@nnnb/hhfast-ui dependency @nnnb/hhfast-utils expected "${utilsVersion}", got "${resolved}"`,
      )
    }
  }
  console.log(`Manifest OK: ${packageName} (no workspace: protocol)`)
}

function pack(packageName) {
  const before = new Set(readFileNames())
  run(['--filter', packageName, 'pack', '--pack-destination', artifactDir], repositoryRoot, false)
  const filename = readFileNames().find(name => name.endsWith('.tgz') && !before.has(name))
  if (!filename) throw new Error(`No tarball created for ${packageName}`)
  const tarballPath = join(artifactDir, filename)
  assertPublishedManifest(tarballPath, packageName)
  return tarballPath
}

function readFileNames() {
  mkdirSync(artifactDir, { recursive: true })
  return readdirSync(artifactDir)
}

const resolvedArtifactDir = resolve(artifactDir)
if (!resolvedArtifactDir.startsWith(resolve(repositoryRoot, 'artifacts'))) {
  throw new Error(`Unsafe artifact directory: ${resolvedArtifactDir}`)
}
rmSync(resolvedArtifactDir, { recursive: true, force: true })
mkdirSync(resolvedArtifactDir, { recursive: true })

const utilsTarball = pack('@nnnb/hhfast-utils')
const uiTarball = pack('@nnnb/hhfast-ui')

console.log('Preparing isolated package consumer')
const resolvedConsumerDir = resolve(consumerDir)
if (!resolvedConsumerDir.startsWith(resolve(tmpdir()))) {
  throw new Error(`Unsafe consumer directory: ${resolvedConsumerDir}`)
}
rmSync(resolvedConsumerDir, { recursive: true, force: true })
mkdirSync(join(consumerDir, 'src'), { recursive: true })
for (const relativePath of ['package.json', 'tsconfig.json', 'index.html', 'src/main.ts', 'src/imports.ts']) {
  copyFileSync(join(fixtureDir, relativePath), join(consumerDir, relativePath))
}
const consumerManifestPath = join(consumerDir, 'package.json')
const consumerManifest = JSON.parse(readFileSync(consumerManifestPath, 'utf8'))
consumerManifest.dependencies['@nnnb/hhfast-utils'] = `file:${utilsTarball}`
consumerManifest.dependencies['@nnnb/hhfast-ui'] = `file:${uiTarball}`
writeFileSync(consumerManifestPath, `${JSON.stringify(consumerManifest, null, 2)}\n`)
writeFileSync(
  join(consumerDir, 'pnpm-workspace.yaml'),
  `packages:\n  - .\noverrides:\n  '@nnnb/hhfast-utils': 'file:${utilsTarball.replaceAll('\\', '/')}'\n`,
)

console.log('Installing packed packages in isolated consumer')
run(['install', '--no-lockfile', '--ignore-scripts', '--config.confirmModulesPurge=false'], consumerDir)
run(['run', 'typecheck'], consumerDir)
run(['run', 'build'], consumerDir)

console.log(`Verified ${utilsTarball}`)
console.log(`Verified ${uiTarball}`)
