<template>
  <v-card max-width="480" width="100%">
    <v-card-item>
      <v-card-title>Register</v-card-title>
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
            autocomplete="new-password"
            :error-messages="passwordError ? [passwordError] : []"
          />
        </div>
        <div class="mb-4">
          <v-text-field
            v-model="passwordConfirmation"
            label="Confirm Password"
            variant="outlined"
            type="password"
            autocomplete="new-password"
            :error-messages="passwordConfirmationError ? [passwordConfirmationError] : []"
          />
        </div>

        <p v-if="error && !usernameError" role="alert" class="text-error" data-testid="form-error">
          {{ error }}
        </p>

        <div class="d-flex justify-end">
          <v-btn type="submit" color="primary" :loading="loading" :disabled="loading">
            Register
          </v-btn>
        </div>

        <div class="d-flex justify-center mt-2">
          <router-link :to="{ name: 'login' }" class="text-primary"
            >Already have an account? Log in</router-link
          >
        </div>
      </form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRegister } from '../../composables/useRegister'

const router = useRouter()

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/
const MIN_PASSWORD_LENGTH = 8

const username = ref('')
const password = ref('')
const passwordConfirmation = ref('')

const usernameError = ref<string | null>(null)
const passwordError = ref<string | null>(null)
const passwordConfirmationError = ref<string | null>(null)

const { loading, error, errorCode, success, submit } = useRegister()

function validate(): boolean {
  usernameError.value = null
  passwordError.value = null
  passwordConfirmationError.value = null
  let valid = true

  if (!username.value) {
    usernameError.value = 'Username is required'
    valid = false
  } else if (!USERNAME_PATTERN.test(username.value)) {
    usernameError.value =
      'Username must be 3-30 characters and contain only letters, numbers, and underscores'
    valid = false
  }

  if (!password.value) {
    passwordError.value = 'Password is required'
    valid = false
  } else if (password.value.length < MIN_PASSWORD_LENGTH) {
    passwordError.value = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    valid = false
  }

  if (!passwordConfirmation.value) {
    passwordConfirmationError.value = 'Password confirmation is required'
    valid = false
  } else if (password.value !== passwordConfirmation.value) {
    passwordConfirmationError.value = 'Passwords do not match'
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
    return
  }

  if (errorCode.value === 'USERNAME_TAKEN') {
    usernameError.value = error.value
  }
}
</script>
