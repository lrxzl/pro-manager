<template>
  <div class="container">
    <h1>{{PROJECT_TITLE}}</h1>
    <p class="subtitle">项目已成功创建！</p>

    <div class="card">
      <h2>开始开发</h2>
      <p>编辑 <code>src/views/Home.vue</code> 开始构建你的应用。</p>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.subtitle {
  color: var(--text-secondary);
  margin-bottom: 24px;
}
code {
  background: var(--bg-input);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
}
</style>
