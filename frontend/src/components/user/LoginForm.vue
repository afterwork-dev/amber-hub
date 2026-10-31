<template>
  <v-card max-width="480" width="100%">
    <v-card-item>
      <v-card-title>Login</v-card-title>
    </v-card-item>
    <v-card-text>
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <v-text-field
            v-model="username"
            label="Username"
            variant="outlined"
            autocomplete="username"
            :error-messages="usernameError ? [usernameError] : []"
          />
        </div>
        <div class="mb-4">
          <v-text-field
            v-model="password"
            label="Password"
            variant="outlined"
            type="password"
            autocomplete="current-password"
            :error-messages="passwordError ? [passwordError] : []"
          />
        </div>

        <p v-if="error" role="alert" class="text-error" data-testid="form-error">
          {{ error }}
        </p>

        <div class="d-flex justify-end">
          <v-btn type="submit" color="primary" :loading="loading" :disabled="loading">
            Login
          </v-btn>
        </div>

        <div class="d-flex justify-center mt-2">
          <v-btn variant="text" :to="{ name: 'register' }">Create an account</v-btn>
        </div>
      </form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLogin } from '../../composables/useLogin'

const router = useRouter()

const username = ref('')
const password = ref('')

const usernameError = ref<string | null>(null)
const passwordError = ref<string | null>(null)

const { loading, error, success, submit } = useLogin()

function validate(): boolean {
  usernameError.value = null
  passwordError.value = null
  let valid = true

  if (!username.value) {
    usernameError.value = 'Username is required'
    valid = false
  }

  if (!password.value) {
    passwordError.value = 'Password is required'
    valid = false
  }

  return valid
}

async function handleSubmit(): Promise<void> {
  if (!validate()) {
    return
  }

  await submit(username.value, password.value)

  if (success.value) {
    router.push({ name: 'dashboard' })
  }
}
</script>
