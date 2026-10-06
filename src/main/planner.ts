import type { CommandRequest, CommandResponse, ProposedAction } from '../shared/contracts';

const action = (id: string, title: string, explanation: string, risk: ProposedAction['risk'], command?: string): ProposedAction => ({
  id, title, explanation, risk, command, requiresApproval: risk !== 'read'
});

export function planCommand(request: CommandRequest): CommandResponse {
  const text = request.text.trim();
  const normalized = text.toLocaleLowerCase('he');

  if (!text) return { kind: 'answer', message: 'כתבו בקשה קצרה כדי להתחיל.', actions: [] };

  if (/עדכו|עדכון|windows update|update/.test(normalized)) {
    return { kind: 'plan', message: 'הכנתי בדיקה בטוחה של עדכוני Windows. התקנה תוצע בנפרד.', actions: [
      action('windows-update-scan', 'בדיקת עדכונים זמינים', 'בדיקה בלבד, ללא התקנה או הפעלה מחדש.', 'read', 'Get-WindowsUpdate'),
      action('windows-update-install', 'התקנת עדכונים נבחרים', 'דורש אישור מפורש והרשאות מנהל.', 'admin', 'Install-WindowsUpdate -AcceptAll')
    ]};
  }

  if (/הורדות|קבצים|תיקי|organize|downloads/.test(normalized)) {
    return { kind: 'plan', message: 'אסרוק את התיקייה ואציג רשימת העברות לפני שאגע בקבצים.', actions: [
      action('files-scan', 'מיפוי קבצים', 'ספירת קבצים לפי סוג, גודל וגיל.', 'read'),
      action('files-organize', 'סידור לתיקיות', 'העברה בלבד; לא מוחקים קבצים וקונפליקטים מקבלים שם חדש.', 'change')
    ]};
  }

  if (/התק|אפליקצ|תוכנ|winget|install/.test(normalized)) {
    return { kind: 'plan', message: 'אמצא התאמה, אציג מקור וגרסה ורק אז אבקש להתקין.', actions: [
      action('app-search', 'חיפוש ב־winget', 'מציג מועמדים ממקור מזוהה.', 'read', 'winget search'),
      action('app-install', 'התקנת הבחירה', 'הפקודה המדויקת תוצג לפני אישור.', 'admin')
    ]};
  }

  return { kind: 'answer', message: `הבקשה תישלח אל ${request.provider}. חיבור API עדיין לא הוגדר, ולכן שום מידע לא יצא מהמחשב.`, actions: [] };
}
