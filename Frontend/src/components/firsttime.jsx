import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { invoke } from "@/lib/electron";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, XCircle, Info } from "lucide-react";
import data from "../../../package.json";
import Button from "./ui/button";

export default function FirstTime() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const firstTime = localStorage.getItem("firstTime");
    // Show if firstTime key is missing or explicitly "true"
    if (!firstTime || firstTime === "true") {
      const timer = setTimeout(() => setOpen(true), 500); // Slight delay for smooth entrance
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGetStarted = async () => {
    localStorage.setItem("firstTime", "false");
    setOpen(false);

    const toastId = toast.loading(
      "Đang tạo điểm khôi phục hệ thống... Vui lòng đợi.",
      { closeOnClick: false, draggable: false }
    );

    try {
      await invoke({ channel: "create-vie-restore-point" });

      toast.update(toastId, {
        render: "Đã tạo điểm khôi phục thành công!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      toast.update(toastId, {
        render: "Không thể tạo điểm khôi phục. Vui lòng thử lại sau.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      console.error("Error creating restore point:", err);
    }
  };

  const handleSkipRestorePoint = () => {
    localStorage.setItem("firstTime", "false");
    setOpen(false);
    toast.info("Đã bỏ qua tạo điểm khôi phục.", { autoClose: 2000 });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/90 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl"
          >
            {/* Glossy Header Effect */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

            <div className="p-8">
              <div className="flex flex-col items-center text-center">

                {/* Icon Badge */}
                <div className="mb-6 rounded-full bg-cyan-500/10 p-4 ring-1 ring-cyan-500/20">
                  <ShieldCheck className="h-10 w-10 text-cyan-400" />
                </div>

                <h2 className="mb-2 text-2xl font-bold text-white tracking-tight">
                  Chào mừng đến với VIE-XF
                </h2>

                <p className="mb-8 text-white/60 text-sm leading-relaxed max-w-sm">
                  Để đảm bảo an toàn tối đa cho hệ thống của bạn, chúng tôi khuyên bạn nên tạo điểm khôi phục trước khi áp dụng các tinh chỉnh.
                </p>

                {/* Information Box */}
                <div className="mb-8 w-full rounded-xl border border-white/5 bg-white/5 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 shrink-0 text-cyan-400 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-xs text-white/80">
                        <span className="font-semibold text-cyan-300">Khuyên dùng:</span> Tạo điểm khôi phục giúp bạn dễ dàng quay lại trạng thái trước đó nếu có sự cố.
                      </p>
                      <p className="text-xs text-white/50 leading-relaxed">
                        Chỉ tải VIE từ <span className="text-white/80">getvie.net</span> hoặc <span className="text-white/80">GitHub</span> chính thức để tránh phần mềm giả mạo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex w-full flex-col gap-3 sm:flex-row">
                  <Button
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white border-0 shadow-lg shadow-cyan-500/20"
                    onClick={handleGetStarted}
                  >
                    Tạo Điểm Khôi Phục
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-white/50 hover:text-white hover:bg-white/5"
                    onClick={handleSkipRestorePoint}
                  >
                    Bỏ qua
                  </Button>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-white/20 uppercase tracking-widest font-mono">
                  <span>v{data?.version || "1.0.0"}</span>
                  <span>•</span>
                  <span>Official Release</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
