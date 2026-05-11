import { createRouter, createWebHistory } from 'vue-router'
import AdminOverviewView from '../views/admin/AdminOverviewView.vue'
import AdminPlaceholderView from '../views/admin/AdminPlaceholderView.vue'
import AdminLoginView from '../views/admin/AdminLoginView.vue'
import AdminCommunityCategoriesView from '../views/admin/AdminCommunityCategoriesView.vue'
import AdminCommunitiesView from '../views/admin/AdminCommunitiesView.vue'
import AdminQuestionsView from '../views/admin/AdminQuestionsView.vue'
import AdminQuestionAnswersView from '../views/admin/AdminQuestionAnswersView.vue'
import AdminPageCategoriesView from '../views/admin/AdminPageCategoriesView.vue'
import AdminPagesView from '../views/admin/AdminPagesView.vue'
import AdminJobsView from '../views/admin/AdminJobsView.vue'
import AdminUsersView from '../views/admin/AdminUsersView.vue'
import AdminFreelancersView from '../views/admin/AdminFreelancersView.vue'
import AdminPostsView from '../views/admin/AdminPostsView.vue'
import AdminFreelanceJobsView from '../views/admin/AdminFreelanceJobsView.vue'
import { isAuthenticated } from '../composables/useAuth'

const adminPlaceholderRoutes = [
  { path: '/admin/adverts', name: 'Manage adverts', title: 'Manage adverts' },
  { path: '/admin/contest', name: 'Manage contest', title: 'Manage contest' },
  { path: '/admin/admin-users', name: 'Manage admin users', title: 'Manage admin users' },
  { path: '/admin/jobs/awaiting-approval', name: 'Jobs awaiting approval', title: 'Jobs awaiting approval' },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/admin',
    },
    {
      path: '/admin',
      name: 'admin-overview',
      component: AdminOverviewView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/communities',
      name: 'Manage communities',
      component: AdminCommunitiesView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/users',
      name: 'Manage users',
      component: AdminUsersView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/community-categories',
      name: 'Community categories',
      component: AdminCommunityCategoriesView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/questions',
      name: 'Manage questions',
      component: AdminQuestionsView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/questions/:questionId/answers',
      name: 'Question answers',
      component: AdminQuestionAnswersView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/posts',
      name: 'Manage posts',
      component: AdminPostsView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/page-categories',
      name: 'Page categories',
      component: AdminPageCategoriesView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/pages',
      name: 'Manage pages',
      component: AdminPagesView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/jobs',
      name: 'Manage jobs',
      component: AdminJobsView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/freelancers',
      name: 'Manage freelancers',
      component: AdminFreelancersView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/freelance-jobs',
      name: 'Manage freelance jobs',
      component: AdminFreelanceJobsView,
      meta: { layout: 'app', requiresAuth: true },
    },
    ...adminPlaceholderRoutes.map((route) => ({
      path: route.path,
      name: route.name,
      component: AdminPlaceholderView,
      props: { title: route.title },
      meta: { layout: 'app', requiresAuth: true },
    })),
    {
      path: '/auth/login',
      name: 'admin-login',
      component: AdminLoginView,
      meta: { layout: 'auth' },
    },
  ],
})

router.beforeEach((to, from, next) => {
  const needsAuth = !!to.meta.requiresAuth
  const authed = isAuthenticated()

  if (needsAuth && !authed) {
    next({ path: '/auth/login' })
    return
  }

  if (to.path === '/auth/login' && authed) {
    next({ path: '/admin' })
    return
  }

  next()
})

export default router
