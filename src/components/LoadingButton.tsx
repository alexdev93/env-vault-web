import { useState, type ButtonHTMLAttributes } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  onClick: () => Promise<unknown> | void;
};

// Shows a spinner in place of its label while the async onClick is running.
export function LoadingButton({ onClick, children, disabled, type = "button", ...rest }: Props) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      await onClick();
    } finally {
      setLoading(false);
    }
  };
  return (
    <button {...rest} type={type} disabled={disabled || loading} onClick={handle}>
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}
