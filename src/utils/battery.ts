import { useState, useEffect } from 'react';

export interface BatteryState {
  level: number;
  charging: boolean;
  supported: boolean;
}

export function useBattery(): BatteryState {
  const [battery, setBattery] = useState<BatteryState>({
    level: 21, // default fallback matching screenshot
    charging: false,
    supported: false,
  });

  useEffect(() => {
    let batteryObj: any = null;

    const updateBattery = () => {
      if (batteryObj) {
        setBattery({
          level: Math.round(batteryObj.level * 100),
          charging: batteryObj.charging,
          supported: true,
        });
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((b: any) => {
          batteryObj = b;
          updateBattery();
          b.addEventListener('levelchange', updateBattery);
          b.addEventListener('chargingchange', updateBattery);
        })
        .catch(() => {
          // ignore error, keep fallback
        });
    }

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', updateBattery);
        batteryObj.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  return battery;
}
