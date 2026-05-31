import { useNavigate } from "react-router-dom";

export default function useVTNavigate() {
  const navigate = useNavigate();
  return (to, options) => {
    const go = () => navigate(to, options);
    if (document.startViewTransition) {
      document.startViewTransition(go);
    } else {
      go();
    }
  };
}
