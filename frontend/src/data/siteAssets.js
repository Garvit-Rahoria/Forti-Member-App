/** Static marketing images (sourced from forti.in, stored in /public/images). */

export const SITE_LOGO = '/images/brand/logo.png'
export const PRESIDENT_PHOTO = '/images/president/suresh-agarwal.jpg'

export const GALLERY_ITEMS = [
  { id: 1, cat: 'Events', title: 'FORTI Annual Gathering', subtitle: 'Jaipur', src: '/images/gallery/01.jpg', span: 'col-span-2 row-span-2' },
  { id: 2, cat: 'Events', title: 'Member Meet', subtitle: 'Rajasthan', src: '/images/gallery/02.jpg', span: '' },
  { id: 3, cat: 'Events', title: 'Trade Summit', subtitle: 'Jaipur', src: '/images/gallery/03.jpg', span: '' },
  { id: 4, cat: 'Events', title: 'Industry Dialogue', subtitle: 'FORTI', src: '/images/gallery/04.jpg', span: '' },
  { id: 5, cat: 'Events', title: 'Leadership Forum', subtitle: 'Rajasthan', src: '/images/gallery/05.jpg', span: '' },
  { id: 6, cat: 'Events', title: 'Member Networking', subtitle: 'FORTI', src: '/images/gallery/06.jpg', span: '' },
]

export const GALLERY_PREVIEW = GALLERY_ITEMS.slice(0, 6)
