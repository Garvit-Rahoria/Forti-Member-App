import api from './client'

export const publicService = {
  getPublicProfile: async (slug) => {
    const response = await api.get(`/public/profile/${slug}`)
    return response.data.data
  },
  
  getBlogHub: async (category = 'insights') => {
    const response = await api.get(`/blog/menus/${category}`)
    return response.data.data
  }
}
