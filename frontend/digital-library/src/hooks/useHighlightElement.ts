import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useHighlightElement(paramName = 'highlight_doc') {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get(paramName);

  useEffect(() => {
    if (highlightId) {
      // Đợi DOM render xong
      setTimeout(() => {
        const element = document.getElementById(`doc-${highlightId}`);
        if (element) {
          // 1. Cuộn tới phần tử
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // 2. Thêm class viền xanh, nền nhạt (giống ảnh của bạn)
          element.classList.add('ring-4', 'ring-primary-400', 'bg-primary-50', 'transition-all', 'duration-500');
          
          // 3. Dọn URL và tắt viền sau 3 giây
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-primary-400', 'bg-primary-50');
            searchParams.delete(paramName);
            setSearchParams(searchParams, { replace: true });
          }, 3000);
        }
      }, 500);
    }
  }, [highlightId, searchParams, setSearchParams, paramName]);
}