import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function PageLoading() {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    </div>
  );
}