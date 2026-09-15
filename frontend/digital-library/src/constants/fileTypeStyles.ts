export interface FileTypeStyle {
  bg: string;
  border: string;
  icon: string;
  badge: string;
  hoverBorder: string;
}

export const FILE_TYPE_STYLES: Record<string, FileTypeStyle> = {
  pdf: {
    bg: 'bg-red-50/70',
    border: 'border-red-200',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-700 border-red-200',
    hoverBorder: 'group-hover:border-red-300',
  },
  docx: {
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    hoverBorder: 'group-hover:border-blue-300',
  },
  doc: {
    bg: 'bg-blue-50/70',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    hoverBorder: 'group-hover:border-blue-300',
  },
  pptx: {
    bg: 'bg-orange-50/70',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    hoverBorder: 'group-hover:border-orange-300',
  },
  ppt: {
    bg: 'bg-orange-50/70',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    hoverBorder: 'group-hover:border-orange-300',
  },
  xlsx: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    hoverBorder: 'group-hover:border-emerald-300',
  },
  xls: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    hoverBorder: 'group-hover:border-emerald-300',
  },
  zip: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    hoverBorder: 'group-hover:border-amber-300',
  },
  image: {
    bg: 'bg-purple-50/70',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    hoverBorder: 'group-hover:border-purple-300',
  },
  default: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: 'text-slate-500',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    hoverBorder: 'group-hover:border-slate-300',
  },
};

export function getFileTypeStyle(rawType?: string): FileTypeStyle {
  if (!rawType) return FILE_TYPE_STYLES.default;
  const clean = rawType.toLowerCase().trim();

  if (clean.includes('pdf')) return FILE_TYPE_STYLES.pdf;
  if (clean.includes('word') || clean.includes('doc')) return FILE_TYPE_STYLES.docx;
  if (clean.includes('excel') || clean.includes('sheet') || clean.includes('xls')) return FILE_TYPE_STYLES.xlsx;
  if (clean.includes('powerpoint') || clean.includes('presentation') || clean.includes('ppt')) return FILE_TYPE_STYLES.pptx;
  if (clean.includes('image') || clean.includes('png') || clean.includes('jpg') || clean.includes('jpeg')) return FILE_TYPE_STYLES.image;
  if (clean.includes('zip') || clean.includes('archive') || clean.includes('rar')) return FILE_TYPE_STYLES.zip;

  return FILE_TYPE_STYLES.default;
}