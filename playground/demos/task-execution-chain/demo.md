```mermaid
flowchart TD
  node_1775011692990_ynsnkm["✅ 创建订单流程\nin: {\"userId\":1001,\"skuId\":777}\nout: {\"ok\":true,\"orderId\":\"1001-777-1775011693140\"}\ntime: 150ms"]
  node_1775011692990_ix0no2["✅ OrderServiceDemo.status#set\nin: \"running\"\nout: -\ntime: 0ms"]
  node_1775011692990_3p0q4v["✅ localCounter#get\nin: -\nout: 0\ntime: 0ms"]
  node_1775011692990_d9q8yv["✅ localCounter#set\nin: 1\nout: -\ntime: 0ms"]
  node_1775011692990_3z1waa["✅ loadUser\nin: [1001]\nout: {\"id\":1001,\"name\":\"user-1001\"}\ntime: 50ms"]
  node_1775011692990_kdb5dm["✅ OrderServiceDemo.loadUser\nin: [1001]\nout: {\"id\":1001,\"name\":\"user-1001\"}\ntime: 50ms"]
  node_1775011693040_crs5r8["❌ loadPicture\nin: [1001]\nout: -\ntime: 10ms"]
  node_1775011693040_nx9ox0["❌ OrderServiceDemo.loadPicture\nin: [1001]\nout: -\ntime: 10ms"]
  node_1775011693051_960olc["✅ fetchUserAge\nin: [1001]\nout: 18\ntime: 10ms"]
  node_1775011693051_4asby7["✅ external.getUserAge\nin: [1001]\nout: 18\ntime: 10ms"]
  node_1775011693061_g1scni["✅ checkStock\nin: [777]\nout: {\"skuId\":777,\"available\":99}\ntime: 48ms"]
  node_1775011693061_ugqjjq["✅ OrderServiceDemo.checkStock\nin: [777]\nout: {\"skuId\":777,\"available\":99}\ntime: 48ms"]
  node_1775011693109_b208cx["✅ calcDiscount\nin: [18]\nout: 9\ntime: 6ms"]
  node_1775011693109_ngdjl4["✅ OrderServiceDemo.calcDiscount\nin: [18]\nout: 9\ntime: 6ms"]
  node_1775011693115_py42w7["✅ OrderServiceDemo.status#get\nin: -\nout: \"running\"\ntime: 0ms"]
  node_1775011693115_zjqo0f["✅ OrderServiceDemo.status#set\nin: \"done\"\nout: -\ntime: 0ms"]
  node_1775011693115_ld7cxf["✅ localCounter#get\nin: -\nout: 1\ntime: 0ms"]
  node_1775011693115_k7enb8["✅ localCounter#get\nin: -\nout: 1\ntime: 0ms"]
  node_1775011693115_a826d7["✅ localCounter#get\nin: -\nout: 1\ntime: 0ms"]
  node_1775011693115_xnk35g["✅ submitOrder\nin: [{\"id\":1001,\"name\":\"user-1001\"},{\"skuId\":777,\"available\":99}]\nout: {\"ok\":true,\"orderId\":\"1001-777-1775011693140\"}\ntime: 25ms"]
  node_1775011693115_rt5n8v["✅ OrderServiceDemo.submitOrder\nin: [{\"id\":1001,\"name\":\"user-1001\"},{\"skuId\":777,\"available\":99}]\nout: {\"ok\":true,\"orderId\":\"1001-777-1775011693140\"}\ntime: 25ms"]
  node_1775011692990_ynsnkm --> node_1775011692990_ix0no2
  node_1775011692990_ynsnkm --> node_1775011692990_3p0q4v
  node_1775011692990_ynsnkm --> node_1775011692990_d9q8yv
  node_1775011692990_ynsnkm --> node_1775011692990_3z1waa
  node_1775011692990_3z1waa --> node_1775011692990_kdb5dm
  node_1775011692990_ynsnkm --> node_1775011693040_crs5r8
  node_1775011693040_crs5r8 --> node_1775011693040_nx9ox0
  node_1775011692990_ynsnkm --> node_1775011693051_960olc
  node_1775011693051_960olc --> node_1775011693051_4asby7
  node_1775011692990_ynsnkm --> node_1775011693061_g1scni
  node_1775011693061_g1scni --> node_1775011693061_ugqjjq
  node_1775011692990_ynsnkm --> node_1775011693109_b208cx
  node_1775011693109_b208cx --> node_1775011693109_ngdjl4
  node_1775011692990_ynsnkm --> node_1775011693115_py42w7
  node_1775011692990_ynsnkm --> node_1775011693115_zjqo0f
  node_1775011692990_ynsnkm --> node_1775011693115_ld7cxf
  node_1775011692990_ynsnkm --> node_1775011693115_k7enb8
  node_1775011692990_ynsnkm --> node_1775011693115_a826d7
  node_1775011692990_ynsnkm --> node_1775011693115_xnk35g
  node_1775011693115_xnk35g --> node_1775011693115_rt5n8v
```