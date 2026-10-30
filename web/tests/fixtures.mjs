export function galleryFixtures() {
  const picture = (width, height, color) =>
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${color}"/><circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 3}" fill="none" stroke="#dbe2ef" stroke-width="12"/></svg>`,
    )
  const categories = [
    {
      id: 1,
      name: '生活',
      alias: 'life',
      children: [{ id: 2, name: '旅行', alias: 'travel', children: [] }],
    },
  ]
  const posts = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    title: `迁移验证照片 ${i + 1}`,
    desc: i === 0 ? '保留原来的布局与交互。' : '',
    location: '杭州',
    time: '2026-10-30 12:00:00',
    categories: [categories[0], categories[0].children[0]],
    images: Array.from({ length: i === 0 ? 3 : 1 }, (_, j) => ({
      id: i * 10 + j + 1,
      title: `照片 ${j + 1}`,
      image_url: picture(
        j === 1 ? 720 : 1200,
        j === 1 ? 1200 : 800,
        j === 1 ? '#7c635b' : '#5269b6',
      ),
      focus_x: 50,
      focus_y: 50,
      desc: '',
      location: '杭州',
      time: '2026-10-30 12:00:00',
      metadata: '35 mm · f/2.8',
    })),
  }))
  return {
    general: { custom_css: '', custom_js: '' },
    meta: {
      site_name: 'Moment',
      site_desc: '照片与生活。',
      bottom_desc: '照片与生活。',
      primary_color: '#5269b6',
      bottom_icon: '/assets/moment-mark.svg',
      site_icon: '/assets/moment-mark.svg',
      entries: [
        { name: 'GitHub', icon: 'lucide:link', url: 'https://github.com/Robert-Stackflow/Moment' },
      ],
    },
    content: {
      page_size: 4,
      local_thumbnails: false,
      map_enabled: true,
      timeline_enabled: true,
      thumbnail_show_location: true,
      thumbnail_show_time: true,
      detail_show_location: true,
      detail_show_time: true,
    },
    categories,
    posts,
  }
}

export async function installFixtures(page) {
  const data = galleryFixtures(),
    state = { unlocked: false, revoked: false, offline: false, lastPassword: null }
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      name = url.pathname,
      query = url.searchParams
    let result,
      status = 200,
      total
    if (name.startsWith('/api/shares/')) {
      if (state.revoked) {
        status = 404
        result = null
      } else if (state.offline) {
        await route.abort('failed')
        return
      } else if (name.endsWith('/unlock')) {
        state.lastPassword = request.postDataJSON().password
        if (state.lastPassword === 'gallery-password') {
          state.unlocked = true
          result = {}
        } else {
          status = 401
          result = null
        }
      } else if (name.endsWith('/lock')) {
        state.unlocked = false
        result = {}
      } else
        result = state.unlocked
          ? {
              title: '分享验证相册',
              description: '仅在本地模拟访问。',
              password_required: true,
              posts: data.posts.slice(0, 2),
              expires_at: Date.UTC(2100, 0, 1) / 1000,
            }
          : { locked: true }
    } else if (name.includes('/settings/')) result = data[name.split('/').at(-1)]
    else if (name.endsWith('/category/list')) result = data.categories
    else if (name.endsWith('/category/get/alias'))
      result = query.get('alias') === 'travel' ? data.categories[0].children[0] : data.categories[0]
    else if (name.endsWith('/blog/list')) {
      const size = Number(query.get('page_size') || 4),
        page = Number(query.get('page') || 1)
      result = data.posts.slice((page - 1) * size, page * size)
      total = data.posts.length
    } else if (/\/blog\/\d+$/.test(name)) {
      result = data.posts.find((post) => post.id === Number(name.split('/').at(-1)))
      if (!result) status = 404
    } else if (name.endsWith('/explore/years')) result = [{ year: '2026', count: 7 }]
    else if (name.endsWith('/explore/points'))
      result = {
        points: [
          {
            count: 7,
            latitude: 30.2,
            longitude: 120.1,
            south: 30.2,
            north: 30.2,
            west: 120.1,
            east: 120.1,
          },
        ],
        truncated: false,
      }
    else if (name.endsWith('/explore/photos'))
      result = {
        photos: data.posts.flatMap((post) =>
          post.images.map((photo) => ({
            ...photo,
            title: post.title,
            photo_id: photo.id,
            post_id: post.id,
          })),
        ),
        total: 7,
      }
    else throw new Error('Unexpected API request: ' + request.method() + ' ' + name)
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({
        code: status,
        data: result,
        total,
        msg: status === 404 ? '分享链接不存在或已失效' : status === 401 ? '密码不正确' : '',
      }),
    })
  })
  return state
}
