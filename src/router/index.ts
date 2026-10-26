import { createRouter, createWebHistory } from 'vue-router'
import AdminOverviewView from '../views/admin/AdminOverviewView.vue'
import AdminPlaceholderView from '../views/admin/AdminPlaceholderView.vue'
import AdminLoginView from '../views/admin/AdminLoginView.vue'
import AdminCommunityCategoriesView from '../views/admin/AdminCommunityCategoriesView.vue'
import AdminCommunitiesView from '../views/admin/AdminCommunitiesView.vue'
import AdminChannelsView from '../views/admin/AdminChannelsView.vue'
import AdminQuestionsView from '../views/admin/AdminQuestionsView.vue'
import AdminQuestionAnswersView from '../views/admin/AdminQuestionAnswersView.vue'
import AdminPageCategoriesView from '../views/admin/AdminPageCategoriesView.vue'
import AdminPagesView from '../views/admin/AdminPagesView.vue'
import AdminJobsView from '../views/admin/AdminJobsView.vue'
import AdminUsersView from '../views/admin/AdminUsersView.vue'
import AdminFreelancersView from '../views/admin/AdminFreelancersView.vue'
import AdminPostsView from '../views/admin/AdminPostsView.vue'
import AdminFreelanceJobsView from '../views/admin/AdminFreelanceJobsView.vue'
import AdminAdvertsView from '../views/admin/AdminAdvertsView.vue'
import AdminLegalDocumentsView from '../views/admin/AdminLegalDocumentsView.vue'
import { isAuthenticated } from '../composables/useAuth'
import { adminAccess, loadAdminAccess } from '../composables/useAdminAccess'
import { ApiError } from '../composables/useApi'

const adminPlaceholderRoutes = [
  { path: '/admin/contest', name: 'Manage contest', title: 'Manage contest' },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/admin/app-updates', name: 'App Updates', component: () => import('../views/admin/AdminAppUpdatesView.vue'), meta: { layout: 'app', requiresAuth: true, superAdmin: true } },
    { path: '/admin/access-denied', component: () => import('../views/admin/AdminAccessDeniedView.vue'), meta: { layout: 'app', requiresAuth: true } },
    { path: '/admin/admin-users', name: 'Manage admin users', component: () => import('../views/admin/AdminAccountsView.vue'), meta: { layout: 'app', requiresAuth: true, superAdmin: true } },
    { path: '/admin/post-audit', name: 'Post audit', component: () => import('../views/admin/AdminPostAuditView.vue'), meta: { layout: 'app', requiresAuth: true, adminAccess: true } },
    { path: '/admin/post-audit/units/:unitId', name: 'Audit unit review', component: () => import('../views/admin/AdminAuditReviewView.vue'), meta: { layout: 'app', requiresAuth: true, adminAccess: true } },
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
      path: '/admin/admin-communities',
      name: 'Admin communities',
      component: AdminChannelsView,
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
      path: '/admin/reported-posts',
      name: 'Reported posts',
      component: () => import('../views/admin/AdminPostsView.vue'),
      props: {
        reportedOnly: true,
        pageTitle: 'Reported Posts',
        pageDescription: 'Review only posts that have been reported, inspect the full details, and moderate the content.',
      },
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/reported-jobs',
      name: 'Reported jobs',
      component: () => import('../views/admin/AdminReportedItemsView.vue'),
      props: { kind: 'jobs', pageTitle: 'Reported Jobs' },
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/reported-questions',
      name: 'Reported questions',
      component: () => import('../views/admin/AdminReportedItemsView.vue'),
      props: { kind: 'questions', pageTitle: 'Reported Questions' },
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/reported-answers',
      name: 'Reported answers',
      component: () => import('../views/admin/AdminReportedItemsView.vue'),
      props: { kind: 'answers', pageTitle: 'Reported Answers' },
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/reported-comments',
      name: 'Reported comments',
      component: () => import('../views/admin/AdminReportedItemsView.vue'),
      props: { kind: 'comments', pageTitle: 'Reported Comments' },
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/reported-pages',
      name: 'Reported pages',
      component: () => import('../views/admin/AdminReportedItemsView.vue'),
      props: { kind: 'pages', pageTitle: 'Reported Pages' },
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
      path: '/admin/deleted-posts',
      name: 'Deleted posts',
      component: AdminPostsView,
      props: {
        deletedOnly: true,
        pageTitle: 'Deleted Posts',
        pageDescription: 'Review posts that have been deleted or removed from public feeds.',
      },
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
      props: {
        defaultStatus: '',
        pageTitle: 'Manage Jobs',
        pageDescription: 'Manage pending, approved, active, and legacy live jobs with regular and freelance job tables.',
      },
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/jobs/awaiting-approval',
      name: 'Jobs awaiting approval',
      component: AdminJobsView,
      props: {
        defaultStatus: 'pending_review',
        pageTitle: 'Jobs Awaiting Approval',
        pageDescription: 'Review pending regular jobs and approve, suspend, delete, or archive them.',
      },
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
    {
      path: '/admin/adverts',
      name: 'Manage adverts',
      component: AdminAdvertsView,
      meta: { layout: 'app', requiresAuth: true },
    },
    {
      path: '/admin/legal-documents',
      name: 'Legal documents',
      component: AdminLegalDocumentsView,
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

router.beforeEach(async (to, from, next) => {
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

  if (needsAuth && to.path !== '/admin/access-denied') {
    const requiresVerifiedAccess = !!(to.meta.adminAccess || to.meta.superAdmin)
    try {
      await loadAdminAccess()
      if (requiresVerifiedAccess && (!adminAccess.value.isAdmin || (to.meta.superAdmin && !adminAccess.value.isSuperAdmin))) {
        next({ path: '/admin/access-denied', query: {
          returnTo: to.fullPath,
          message: to.meta.superAdmin && adminAccess.value.isAdmin
            ? 'This page requires superadmin access. The server identifies your current account as an ordinary admin.'
            : 'The server has not granted admin access to your current account.',
        } })
        return
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        next('/auth/login')
        return
      }
      if (requiresVerifiedAccess) {
        next({ path: '/admin/access-denied', query: {
          returnTo: to.fullPath,
          message: error instanceof ApiError && error.status === 403
            ? 'The permissions endpoint denied access for your current account (403).'
            : `Unable to verify permissions using /api/admin/users/me${error instanceof ApiError ? ` (HTTP ${error.status})` : ''}: ${error instanceof Error ? error.message : 'Please try again.'}`,
        } })
        return
      }
    }
  }

  next()
})

export default router
