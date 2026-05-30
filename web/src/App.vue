<template>
  <div id="app">
    <router-view />
    <div class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        {{ toast.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { useToast } from './composables/useToast'

const { toasts } = useToast()
</script>
