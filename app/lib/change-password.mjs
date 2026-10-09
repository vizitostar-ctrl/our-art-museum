export async function changeOwnPassword(auth, current, password, confirmation) {
  if (!current) throw new Error("현재 비밀번호를 입력해 주세요.");
  if (password.length < 12) throw new Error("새 비밀번호는 12자 이상 입력해 주세요.");
  if (password !== confirmation) throw new Error("새 비밀번호와 확인 입력이 일치하지 않습니다.");
  if (current === password) throw new Error("현재 비밀번호와 다른 비밀번호를 입력해 주세요.");
  const { data, error } = await auth.getUser();
  if (error || !data?.user?.email) throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  const verified = await auth.signInWithPassword({ email: data.user.email, password: current });
  if (verified.error || verified.data?.user?.id !== data.user.id) {
    throw new Error("현재 비밀번호 확인에 실패했습니다. 비밀번호와 연결 상태를 확인해 주세요.");
  }
  // Only the authenticated user's password is changed; never use an admin key.
  const result = await auth.updateUser({ password });
  if (result.error) {
    if (result.error.code === "weak_password") throw new Error("보안 기준에 맞는 더 강한 비밀번호를 입력해 주세요.");
    if (result.error.code === "same_password") throw new Error("기존과 다른 비밀번호를 입력해 주세요.");
    if (result.error.code === "reauthentication_needed") throw new Error("다시 로그인한 뒤 비밀번호를 변경해 주세요.");
    throw new Error("변경 결과를 확인하지 못했습니다. 자동 재시도하지 않습니다. 새 비밀번호로 로그인되는지 확인해 주세요.");
  }
  if (result.data?.user?.id !== data.user.id) throw new Error("변경 결과를 확인하지 못했습니다. 다시 로그인해 확인해 주세요.");
}
