import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { ApiService, CrmSettingItem } from "@/crm/api";
import { useAuth } from "./AuthContext";

interface CrmSettingsContextType {
  statuses: CrmSettingItem[];
  sources: CrmSettingItem[];
  activityTypes: CrmSettingItem[];
  customFields: any[];
  isLoaded: boolean;
  reload: () => void;
}

const CrmSettingsContext = createContext<CrmSettingsContextType>({
  statuses: [],
  sources: [],
  activityTypes: [],
  customFields: [],
  isLoaded: false,
  reload: () => {},
});

export function CrmSettingsProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<CrmSettingItem[]>([]);
  const [sources, setSources] = useState<CrmSettingItem[]>([]);
  const [activityTypes, setActivityTypes] = useState<CrmSettingItem[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const { isAuthenticated } = useAuth();

  const load = () => {
    if (!isAuthenticated) return; // Don't try loading if not authenticated
    
    Promise.all([
      ApiService.getCrmSettings(),
      ApiService.getCustomFields()
    ])
      .then(([grouped, cfData]) => {
        const statusOptions = (grouped.LEAD_STATUS || []).filter((s) => s.isActive);
        const leadSourceOptions = (grouped.LEAD_SOURCE || []).filter((s) => s.isActive);
        const activityOptions = (grouped.ACTIVITY_TYPE || []).filter((s) => s.isActive);
        const activeFields = (cfData || []).filter((f) => f.isActive);
        
        setStatuses(statusOptions);
        setSources(leadSourceOptions);
        setActivityTypes(activityOptions);
        setCustomFields(activeFields);
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load CRM settings", err);
        // fallback so the app doesn't break
        setStatuses([]);
        setSources([]);
        setActivityTypes([]);
        setCustomFields([]);
        setIsLoaded(true);
      });
  };

  useEffect(() => {
    load();
  }, [isAuthenticated]);

  return (
    <CrmSettingsContext.Provider value={{ statuses, sources, activityTypes, customFields, isLoaded, reload: load }}>
      {children}
    </CrmSettingsContext.Provider>
  );
}

export function useCrmSettings() {
  return useContext(CrmSettingsContext);
}
