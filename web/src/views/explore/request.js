export async function exploreRequest(path, params = {}, signal) {
  const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  const response = await fetch(`/api/v1/visitor/explore/${path}?${query}`, { signal })
  const result = await response.json()
  if (!response.ok) throw new Error(result.msg || '暂时无法加载，请重试')
  return result.data
}
