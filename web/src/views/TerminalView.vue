<template>
  <div class="container">
    <header class="header">
      <button class="btn btn-outline" @click="$router.push(`/project/${projectId}`)">← 返回</button>
      <h1>💻 终端</h1>
      <div class="header-actions">
        <button
          v-if="!connected"
          class="btn btn-success btn-sm"
          @click="connectTerminal"
        >
          连接
        </button>
        <button
          v-else
          class="btn btn-danger btn-sm"
          @click="disconnectTerminal"
        >
          断开
        </button>
      </div>
    </header>

    <div class="terminal-card card">
      <div class="terminal-output" ref="outputRef">
        <div
          v-for="(line, i) in outputLines"
          :key="i"
          :class="['output-line', line.type]"
        >{{ line.text }}</div>
      </div>

      <div class="terminal-input">
        <span class="prompt">$</span>
        <input
          v-model="commandInput"
          placeholder="输入命令..."
          :disabled="!connected"
          @keyup.enter="sendCommand"
          ref="inputRef"
        />
        <button
          class="btn btn-primary btn-sm"
          :disabled="!connected || !commandInput"
          @click="sendCommand"
        >
          执行
        </button>
      </div>
    </div>

    <!-- 快捷命令 -->
    <div class="quick-commands card">
      <div class="quick-title">快捷命令</div>
      <div class="quick-list">
        <button
          v-for="cmd in quickCommands"
          :key="cmd.command"
          class="btn btn-sm btn-outline"
          :disabled="!connected"
          @click="runQuickCommand(cmd.command)"
        >
          {{ cmd.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import * as projectsApi from '../api/projects'
import { useToast } from '../composables/useToast'

const route = useRoute()
const toast = useToast()

const projectId = route.params.id
const project = ref(null)
const connected = ref(false)
const commandInput = ref('')
const outputLines = ref([])
const outputRef = ref(null)
const inputRef = ref(null)

let ws = null

const quickCommands = [
  { label: '📁 ls', command: 'ls -la' },
  { label: '📦 npm -v', command: 'npm -v' },
  { label: '🟢 node -v', command: 'node -v' },
  { label: '📊 df -h', command: 'df -h' },
  { label: '🧹 clear', command: 'clear' },
  { label: '📍 pwd', command: 'pwd' }
]

const loadProject = async () => {
  try {
    const res = await projectsApi.getProject(projectId)
    project.value = res.data
  } catch (err) {
    toast.error(err.message)
  }
}

const addOutput = (text, type = 'stdout') => {
  outputLines.value.push({ text, type })
  // 限制输出行数
  if (outputLines.value.length > 1000) {
    outputLines.value = outputLines.value.slice(-500)
  }
  nextTick(() => {
    if (outputRef.value) {
      outputRef.value.scrollTop = outputRef.value.scrollHeight
    }
  })
}

const connectTerminal = () => {
  if (ws) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws/terminal`

  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    connected.value = true
    addOutput('已连接到终端', 'system')
    // 发送启动消息
    ws.send(JSON.stringify({
      type: 'start',
      cwd: project.value?.rootDir || '.'
    }))
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if (msg.type === 'stdout') {
        addOutput(msg.data, 'stdout')
      } else if (msg.type === 'stderr') {
        addOutput(msg.data, 'stderr')
      } else if (msg.type === 'exit') {
        addOutput(`进程退出，代码: ${msg.code}`, 'system')
      } else if (msg.type === 'started') {
        addOutput(`Shell 已启动 (PID: ${msg.pid})`, 'system')
      } else if (msg.type === 'error') {
        addOutput(`错误: ${msg.message}`, 'error')
      }
    } catch {
      addOutput(event.data, 'stdout')
    }
  }

  ws.onclose = () => {
    connected.value = false
    addOutput('终端连接已断开', 'system')
    ws = null
  }

  ws.onerror = () => {
    addOutput('连接错误', 'error')
  }
}

const disconnectTerminal = () => {
  if (ws) {
    ws.close()
    ws = null
  }
}

const sendCommand = () => {
  if (!ws || !commandInput.value) return
  addOutput(`$ ${commandInput.value}`, 'command')
  ws.send(JSON.stringify({
    type: 'input',
    data: commandInput.value + '\n'
  }))
  commandInput.value = ''
}

const runQuickCommand = (cmd) => {
  commandInput.value = cmd
  sendCommand()
}

onMounted(() => {
  loadProject()
})

onUnmounted(() => {
  disconnectTerminal()
})
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px 0;
}

.header h1 {
  flex: 1;
  font-size: 18px;
}

.terminal-card {
  margin-bottom: 16px;
}

.terminal-output {
  background: #0d1117;
  border-radius: var(--radius-sm);
  padding: 12px;
  min-height: 400px;
  max-height: 60vh;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.output-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.output-line.stdout {
  color: #c9d1d9;
}

.output-line.stderr {
  color: #f85149;
}

.output-line.system {
  color: #58a6ff;
  font-style: italic;
}

.output-line.command {
  color: #7ee787;
  font-weight: bold;
}

.output-line.error {
  color: #f85149;
  font-weight: bold;
}

.terminal-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px;
  background: var(--bg);
  border-radius: var(--radius-sm);
}

.prompt {
  color: var(--success);
  font-family: monospace;
  font-weight: bold;
}

.terminal-input input {
  flex: 1;
  background: transparent;
  border: none;
  font-family: monospace;
  font-size: 14px;
}

.terminal-input input:focus {
  outline: none;
}

.quick-commands {
  padding: 16px;
}

.quick-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .terminal-output {
    min-height: 300px;
  }
}
</style>
