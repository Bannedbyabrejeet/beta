/** Color del badge según el método HTTP. */
export function methodBadgeClass(method: string): string {
  switch (method) {
    case 'GET':
      return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    case 'POST':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'PUT':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'DELETE':
      return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    default:
      return 'bg-slate-700 text-slate-300';
  }
}
