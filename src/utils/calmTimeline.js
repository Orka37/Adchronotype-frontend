// Split overnight windows at midnight; 24:00 is the end of the same day.
export function windowSegments(windows = []) {
 const minutes = text => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(text)) return null;
  const [h,m]=text.split(':').map(Number);return h*60+m;
 };
 return windows.flatMap(({start,end})=>{
  const a=minutes(start),b=minutes(end);
  if(a==null||b==null||a===b)return [];
  return b>a?[[a,b]]:[[a,1440],[0,b]].filter(([x,y])=>y>x);
 });
}
