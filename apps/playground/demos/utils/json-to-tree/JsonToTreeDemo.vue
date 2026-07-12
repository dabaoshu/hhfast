<script setup lang="ts">
import { computed, ref } from "vue";
import { jsonToTree, type JsonLeafNodeMode, type JsonTreeNode } from '@nnnb/hhfast-utils'
import TreeNodeItem from "./TreeNodeItem.vue";
import TypeTreeNodeItem from "./TypeTreeNodeItem.vue";
import BusinessTypeOutputPanel from "./BusinessTypeOutputPanel.vue";

const jsonInput = ref(`{
  "name": "hhfast",
  "version": 1,
  "tags": ["ui", "vue3", "typescript"],
  "meta": {
    "author": "nnnb",
    "enabled": true,
    "features": {
      "toast": true,
      "modal": true
    }
  }
}`);
const errorMessage = ref("");
const treeResult = ref<JsonTreeNode | null>(null);
const keepContainerValue = ref(false);
const leafNodeMode = ref<JsonLeafNodeMode>("value");
const parsedJson = ref<unknown>(undefined);

/**
 * @description 将用户输入的 JSON 文本解析并转换为树结构。
 */
const handleConvert = (): void => {
  errorMessage.value = "";
  try {
    const parsed = JSON.parse(jsonInput.value) as unknown;
    parsedJson.value = parsed;
    treeResult.value = jsonToTree(parsed, {
      rootLabel: "json",
      keepRawValueOnContainer: keepContainerValue.value,
      leafNodeMode: leafNodeMode.value,
    });
  } catch (error) {
    parsedJson.value = undefined;
    treeResult.value = null;
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
};

/**
 * @description 载入一个更复杂的示例数据。
 */
const fillComplexExample = (): void => {
  jsonInput.value = `{
  "project": {
    "id": "demo-1001",
    "name": "JsonToTree Playground",
    "members": [
      { "id": 1, "name": "Alice", "roles": ["owner", "dev"] },
      { "id": 2, "name": "Bob", "roles": ["qa"] }
    ],
    "stats": {
      "builds": 18,
      "successRate": 0.94,
      "lastBuildAt": "2026-04-13T09:30:00.000Z"
    }
  },
  "flags": {
    "isActive": true,
    "isArchived": false
  }
}`;
  handleConvert();
};

/**
 * @description 载入业务场景示例，并展示 jsonToTree 到目标结构的转换结果。
 */
const fillBusinessExample = (): void => {
  jsonInput.value = `{
  "level1": {
    "level2s": "hello",
    "level2o": {
      "level2o_2o": {
        "obj": {}
      },
      "level2o_2s": "world"
    }
  }
}`;
  handleConvert();
};

/**
 * @description 将输入重置为最小示例。
 */
const fillSimpleExample = (): void => {
  jsonInput.value = `{
  "a": 1,
  "b": {
    "c": [1, 2, 3]
  }
}`;
  handleConvert();
};

/**
 * @description 统计当前树的总节点数。
 */
const nodeCount = computed(() => {
  const root = treeResult.value;
  if (!root) {
    return 0;
  }
  let count = 0;
  const walk = (node: JsonTreeNode): void => {
    count += 1;
    node.children?.forEach((child) => walk(child));
  };
  walk(root);
  return count;
});

handleConvert();
</script>

<template>
  <section class="json-tree-demo">
    <h2 class="json-tree-demo__title">JSON To Tree Demo</h2>
    <p class="json-tree-demo__desc">
      输入合法 JSON 后点击转换，右侧会展示 `jsonToTree`
      输出的树结构；可切换“值节点 / 类型节点”以及是否在对象/数组节点保留原始值。
    </p>

    <div class="json-tree-demo__toolbar">
      <button type="button" class="btn btn--primary" @click="handleConvert">
        转换
      </button>
      <button type="button" class="btn" @click="fillSimpleExample">
        填充简单示例
      </button>
      <button type="button" class="btn" @click="fillComplexExample">
        填充复杂示例
      </button>
      <button type="button" class="btn" @click="fillBusinessExample">
        填充业务示例
      </button>
      <label class="checkbox">
        <input
          v-model="keepContainerValue"
          type="checkbox"
          @change="handleConvert"
        />
        <span>保留对象/数组节点原始值</span>
      </label>
      <label class="mode-select">
        <span>叶子节点模式</span>
        <select v-model="leafNodeMode" @change="handleConvert">
          <option value="value">值节点（value）</option>
          <option value="type">类型节点（type）</option>
        </select>
      </label>
    </div>

    <div class="json-tree-demo__layout">
      <div class="panel">
        <h3 class="panel__title">JSON 输入</h3>
        <textarea
          v-model="jsonInput"
          class="json-input mono"
          spellcheck="false"
          placeholder="请输入合法 JSON"
        />
        <p v-if="errorMessage" class="error">解析失败：{{ errorMessage }}</p>
      </div>

      <div class="panel">
        <h3 class="panel__title">
          Tree 结果（节点数：{{ nodeCount }}，模式：{{ leafNodeMode }}）
        </h3>
        <div v-if="treeResult" class="tree-wrap">
          <ul class="tree-root">
            <TreeNodeItem
              v-if="leafNodeMode === 'value'"
              :node="treeResult"
              :default-expand-level="2"
            />
            <TypeTreeNodeItem
              v-else
              :node="treeResult"
              :default-expand-level="2"
            />
          </ul>
        </div>
        <div v-else class="empty">暂无结果</div>
      </div>
    </div>

    <div class="panel">
      <h3 class="panel__title">业务结构结果（类型节点直转）</h3>
      <p class="panel__sub-desc">
        该结果用于模拟输出参数配置：`key/outputType/fields/schemas/fieldId/parentId/linkId/level`。
      </p>
      <BusinessTypeOutputPanel :source-data="parsedJson" />
    </div>
  </section>
</template>

<style scoped>
.json-tree-demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.json-tree-demo__title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.json-tree-demo__desc {
  margin: 0;
  color: #666;
}

.json-tree-demo__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.json-tree-demo__layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 960px) {
  .json-tree-demo__layout {
    grid-template-columns: 1fr;
  }
}

.panel {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}

.panel__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
}

.panel__sub-desc {
  margin: 0 0 8px;
  color: #666;
  font-size: 13px;
}

.btn {
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #333;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  cursor: pointer;
}

.btn--primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #555;
}

.mode-select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #555;
}

.mode-select select {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 13px;
  background: #fff;
}

.json-input {
  width: 100%;
  min-height: 320px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 10px;
  resize: vertical;
  font-size: 13px;
  line-height: 1.5;
}

.tree-wrap {
  max-height: 460px;
  overflow: auto;
}

.tree-root,
.tree-root ul {
  margin: 0;
  padding-left: 18px;
}

.tree-root li {
  margin: 4px 0;
}

summary {
  cursor: pointer;
}

.error {
  margin: 8px 0 0;
  color: #cf1322;
  font-size: 13px;
}

.empty {
  color: #999;
  font-size: 13px;
}
</style>
