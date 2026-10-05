export const goals = [
 ['observation','관찰','원작의 색·선·질감에서 눈에 띄는 것은 무엇인가요?'],
 ['intent','의도','패러디에 어떤 경험이나 생각을 담았나요?'],
 ['expression','표현','그 생각이 드러나는 부분은 어디인가요?'],
 ['change','변화','그대로 둘 부분과 AI로 바꿀 표현을 각각 말해 볼까요?'],
 ['communication','소통','친구가 이 작품을 보며 무엇을 느끼거나 생각하면 좋겠나요?'],
 ['summary','정리','지금까지 이야기한 내용을 한 문장으로 정리해 볼까요?'],
];
export const emptyLearning = () => ({turns:[],covered:[],summary:{intent:'',keep:'',change:'',observation:''},confirmed:false,reflection:{match:'',evidence:'',next:''},survey:{observe:'',judge:'',peer:'',difficulty:''},publicNote:'',title:''});
export const hesitant = s => /^(몰라(요|겠어요)?|모르겠(어|어요)|해줘|알아서( 해줘)?|글쎄(요)?|잘 모르겠어요)[.!?\s]*$/.test(s.trim());
export function nextQuestion(turns, covered = []) {
 const done = new Set(covered);
 const last = turns.at(-1);
 if (last && hesitant(last.answer) && !last.easy) return {goal:last.goal,question:'색, 선, 질감, 이야기 중 하나를 골라 볼까요? 고른 부분이 어떻게 보이는지 짧게 말해 주세요.',easy:true};
 const next = goals.find(([key])=>!done.has(key));
 if (!next || turns.length>=8) return {done:true};
 return {goal:next[0],question:next[2],easy:false};
}
export function makePrompt(summary, revision='') {
 return `첨부한 학생의 손그림 패러디를 바탕으로 표현을 변환하세요. 학생의 구성과 소재를 존중하세요.\n학생이 관찰한 원작의 표현: ${summary.observation}\n표현 의도: ${summary.intent}\n반드시 유지할 부분: ${summary.keep}\n바꾸고 싶은 색·선·질감: ${summary.change}\n${revision ? `이전 결과를 보고 학생이 수정한 요청: ${revision}\n` : ''}학생이 요청하지 않은 인물·사물·글자를 추가하지 마세요.`;
}
export function validateLearning(v) {
 if (!v || typeof v !== 'object' || !Array.isArray(v.turns) || v.turns.length>8) return false;
 if (!v.turns.every(t=>goals.some(g=>g[0]===t.goal) && typeof t.question==='string' && t.question.length<=500 && typeof t.answer==='string' && t.answer.length<=1000)) return false;
 return ['intent','keep','change','observation'].every(k=>typeof v.summary?.[k]==='string' && v.summary[k].length<=1000) && JSON.stringify(v).length<=24000;
}
