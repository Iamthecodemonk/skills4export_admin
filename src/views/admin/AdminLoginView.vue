<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login, isAuthenticated } from '../../composables/useAuth'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)
const cursorX = ref('50%')
const cursorY = ref('50%')

if (isAuthenticated()) {
  router.replace('/admin')
}

async function submit(e: Event) {
  e.preventDefault()
  error.value = null
  loading.value = true
  try {
    const res = await login(email.value.trim(), password.value)
    if (res.ok) {
      router.push('/admin')
    } else {
      error.value = res.error || 'Login failed'
    }
  } finally {
    loading.value = false
  }
}

function updateCursor(e: PointerEvent) {
  cursorX.value = `${e.clientX}px`
  cursorY.value = `${e.clientY}px`
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div
    class="auth-shell relative min-h-screen overflow-hidden text-slate-950"
    :style="{ '--cursor-x': cursorX, '--cursor-y': cursorY }"
    @pointermove="updateCursor"
  >
    <div class="auth-mesh absolute inset-0"></div>
    <div class="auth-grid absolute inset-0"></div>
    <div class="auth-noise absolute inset-0"></div>
    <div class="auth-spotlight absolute inset-0"></div>

    <main class="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
      <div class="relative flex w-full max-w-5xl justify-center">
        <section class="auth-card w-full max-w-sm rounded-md p-8">
          <h1 class="mb-6 text-2xl font-bold">Login to your account</h1>

          <form @submit="submit" class="space-y-4">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input v-model="email" type="email" required class="w-full rounded-md border border-slate-300 bg-white/86 px-4 py-3 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" />
            </div>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <label class="block text-sm font-semibold text-slate-700">Password</label>
                <a class="text-sm font-semibold text-slate-600 hover:text-slate-950 hover:underline" href="#">Forgot password?</a>
              </div>
              <div class="relative">
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="w-full rounded-md border border-slate-300 bg-white/86 px-4 py-3 pr-12 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-500 hover:text-slate-900"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  :title="showPassword ? 'Hide password' : 'Show password'"
                  @click="togglePasswordVisibility"
                >
                  <EyeOff v-if="showPassword" class="h-4 w-4" aria-hidden="true" />
                  <Eye v-else class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div v-if="error" class="text-sm text-red-600">{{ error }}</div>

            <div>
              <button :disabled="loading" type="submit" class="w-full rounded-md bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70">
                {{ loading ? 'Signing in...' : 'Login now' }}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
  --cursor-x: 50%;
  --cursor-y: 50%;
  background:
    radial-gradient(circle at 50% 42%, rgba(242, 249, 255, 0.78) 0%, rgba(209, 232, 246, 0.42) 29%, rgba(12, 41, 91, 0.08) 58%, rgba(4, 13, 43, 0.16) 100%),
    linear-gradient(135deg, #061238 0%, #0d2f66 31%, #87bed9 66%, #f7fbff 100%);
}

.auth-mesh {
  background:
    radial-gradient(ellipse at 18% 18%, rgba(80, 167, 211, 0.48), transparent 35%),
    radial-gradient(ellipse at 74% 24%, rgba(255, 255, 255, 0.58), transparent 36%),
    radial-gradient(ellipse at 58% 82%, rgba(35, 112, 170, 0.22), transparent 42%),
    linear-gradient(120deg, rgba(3, 10, 36, 0.34), rgba(255, 255, 255, 0.2));
  background-size: 130% 130%;
  animation: mesh-drift 16s ease-in-out infinite alternate;
  filter: saturate(0.95);
}

.auth-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.38), transparent 68%);
}

.auth-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.42'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
  opacity: 0.2;
}

.auth-spotlight {
  background: radial-gradient(circle 230px at var(--cursor-x) var(--cursor-y), rgba(255, 255, 255, 0.24), rgba(59, 130, 246, 0.08) 34%, transparent 70%);
  mix-blend-mode: soft-light;
  opacity: 0.8;
  pointer-events: none;
}

.auth-card {
  position: relative;
  border: 1px solid rgba(214, 236, 255, 0.78);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.82), rgba(241, 248, 255, 0.68));
  box-shadow:
    0 0 0 1px rgba(14, 165, 233, 0.12),
    0 0 42px rgba(14, 165, 233, 0.2),
    0 30px 90px rgba(4, 19, 48, 0.26),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(18px);
}

.auth-card::before {
  position: absolute;
  inset: -1px;
  z-index: -1;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.44), rgba(255, 255, 255, 0), rgba(56, 189, 248, 0.28));
  content: "";
  filter: blur(14px);
  opacity: 0.72;
}

@keyframes mesh-drift {
  0% {
    background-position: 0% 44%;
    transform: scale(1);
  }

  100% {
    background-position: 100% 56%;
    transform: scale(1.04);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-mesh {
    animation: none;
  }
}
</style>
