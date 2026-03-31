flowchart TD
  fetch_user["✅ 拉取用户信息\nin: {\"userId\":1024}\nout: {\"id\":1024,\"name\":\"Alice\",\"level\":\"vip\"}\ntime: 120ms"]
  fetch_orders["✅ 拉取订单列表\nin: {\"userId\":1024,\"pageSize\":20}\nout: [{\"id\":\"o1\",\"amount\":99},{\"id\":\"o2\",\"amount\":188}]\ntime: 180ms"]
  calc_report["✅ 聚合报表计算\nin: {\"dimensions\":[\"amount\",\"count\"]}\nout: {\"count\":2,\"amount\":287,\"avg\":143.5}\ntime: 110ms"]
  write_cache["✅ 写入缓存\nin: {\"key\":\"report:user:1024\"}\nout: {\"ok\":true,\"ttl\":300}\ntime: 20ms"]
  notify["❌ 通知前端\nin: {\"channel\":\"report-ready\"}\nout: -\ntime: 29ms"]
  fetch_user -->|user| calc_report
  fetch_orders -->|orders| calc_report
  calc_report -->|report| write_cache
  write_cache -->|cache-key| notify