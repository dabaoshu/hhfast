<script setup lang="ts">
import { computed } from "vue";

interface BusinessOutputItem {
  key: string;
  outputType: string;
  fields: string;
  label?: string;
  schemas: string;
  outputDesc: string;
  fieldId: string;
  level: number;
  parentId: string;
  linkId: string;
  type?: string;
  isRequired?: number;
}

const props = defineProps<{
  sourceData: unknown;
}>();

let businessIdSeed = 0;
const createBusinessId = (): string => {
  businessIdSeed += 1;
  return `N${String(businessIdSeed).padStart(6, "0")}`;
};

/**
 * @description 将任意值映射为业务 outputType 类型文案。
 * @param value 任意输入值。
 */
const toBusinessOutputType = (value: unknown): string => {
  if (value === null) {
    return "Null";
  }
  if (value === undefined) {
    return "Undefined";
  }
  if (Array.isArray(value)) {
    return "Array";
  }

  const valueType = typeof value;
  switch (valueType) {
    case "object":
      return "Object";
    case "string":
      return "String";
    case "number":
      return "Number";
    case "boolean":
      return "Boolean";
    default:
      return "Unknown";
  }
};

/**
 * @description 递归拍平原始 JSON 数据为业务结构数组。
 * @param value 当前节点值。
 * @param key 节点显示 key。
 * @param fields 字段路径。
 * @param parentId 父节点 ID。
 * @param parentLinkId 父链路 ID。
 * @param level 当前层级。
 * @param schemaTrail 父级 schema 轨迹。
 * @param result 输出数组。
 * @param isRoot 是否根节点。
 */
const flattenBusinessOutputFromJson = (
  value: unknown,
  key: string,
  fields: string,
  parentId: string,
  parentLinkId: string,
  level: number,
  schemaTrail: string[],
  result: BusinessOutputItem[],
  isRoot: boolean,
): void => {
  const fieldId = createBusinessId();
  const outputType = toBusinessOutputType(value);
  const currentSchemaTrail = [...schemaTrail, outputType];
  const linkId = parentLinkId ? `${parentLinkId}-${fieldId}` : fieldId;

  const item: BusinessOutputItem = {
    key,
    outputType,
    fields,
    schemas: currentSchemaTrail.join("."),
    outputDesc: "",
    fieldId,
    level,
    parentId,
    linkId,
  };

  if (isRoot) {
    item.label = "输出参数";
    item.type = "paramsOutput";
    item.isRequired = 0;
  }

  result.push(item);

  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      flattenBusinessOutputFromJson(
        child,
        `[${index}]`,
        `${fields}[${index}]`,
        fieldId,
        linkId,
        level + 1,
        currentSchemaTrail,
        result,
        false,
      );
    });
    return;
  }

  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) => {
      flattenBusinessOutputFromJson(
        childValue,
        childKey,
        `${fields}.${childKey}`,
        fieldId,
        linkId,
        level + 1,
        currentSchemaTrail,
        result,
        false,
      );
    });
  }
};

/**
 * @description 将原始 JSON 转换为业务扁平结构。
 * @param source 输入数据。
 */
const convertJsonToBusinessOutput = (source: unknown): BusinessOutputItem[] => {
  if (source === undefined) {
    return [];
  }

  businessIdSeed = 0;
  const result: BusinessOutputItem[] = [];
  flattenBusinessOutputFromJson(source, "json", "json", "", "", 1, [], result, true);
  return result;
};

const businessOutput = computed<BusinessOutputItem[]>(() =>
  convertJsonToBusinessOutput(props.sourceData),
);
</script>

<template>
  <pre class="business-output mono">{{ JSON.stringify(businessOutput, null, 2) }}</pre>
</template>

<style scoped>
.business-output {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  background: #fafafa;
  padding: 10px;
  font-size: 12px;
  line-height: 1.45;
}
</style>
