import { useQuery } from '@tanstack/react-query'
import { publicService } from '../api/publicService'

export const usePublicProfile = (slug) => {
  return useQuery({
    queryKey: ['public-profile', slug],
    queryFn: () => publicService.getPublicProfile(slug),
    enabled: !!slug,
  })
}

export const useBlogHub = (category = 'insights') => {
  return useQuery({
    queryKey: ['blog-hub', category],
    queryFn: () => publicService.getBlogHub(category),
    staleTime: 60_000,
  })
}
