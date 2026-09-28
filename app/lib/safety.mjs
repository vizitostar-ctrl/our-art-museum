// Mutations are never automatically retried: a lost response can hide a successful write.
export function requireChangedRow(data, expectedId) {
  if (!Array.isArray(data) || data.length !== 1 || String(data[0].id) !== String(expectedId)) {
    throw new Error("작품 변경을 확인하지 못했습니다. 목록을 새로고침해 현재 상태를 확인해 주세요.");
  }
  return data[0];
}
export async function withTimeout(promise, ms = 10000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("연결 시간이 초과되었습니다. 다시 시도해 주세요.")), ms);
    })]);
  } finally { clearTimeout(timer); }
}
export async function readAdminSession(client) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await withTimeout(client.auth.getSession());
      if (error) throw error;
      if (data?.session) return data.session;
      if (attempt === 1) return null;
    } catch (error) { if (attempt === 1) throw error; }
    await new Promise(resolve => setTimeout(resolve, 700));
  }
}
export async function removeNewUploads(client, paths) {
  if (!paths.length) return true;
  try {
    const unique = [...new Set(paths)];
    const { data, error } = await client.storage.from("artworks").remove(unique);
    if (error) throw error;
    if (!Array.isArray(data) || data.length !== unique.length) return false;
    return true;
  } catch (error) { console.error("새 이미지 정리 실패", error); return false; }
}
