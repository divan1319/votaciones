export default defineNuxtRouteMiddleware(async (to) => {
  const { data } = await useFetch('/api/me');
  if (!data.value?.user) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    });
  }

  if (data.value.user.role !== 'admin') {
    return navigateTo('/judge');
  }
});
