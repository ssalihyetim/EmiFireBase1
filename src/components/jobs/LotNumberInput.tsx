import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getLotNumberFromJobId, getPartNameWithLot } from '@/lib/lot-number-generator';

interface LotNumberDisplayProps {
  jobId: string;
  partName: string;
  className?: string;
}

export function LotNumberDisplay({ jobId, partName, className = '' }: LotNumberDisplayProps): React.ReactNode {
  const lotNumber = getLotNumberFromJobId(jobId);
  
  if (!lotNumber) {
    return <span className={className}>{partName}</span>;
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span>{partName}</span>
      <Badge variant="secondary" className="text-xs">
        Lot {lotNumber}
      </Badge>
    </div>
  );
}

interface JobDisplayNameProps {
  jobId: string;
  partName: string;
}

export function getJobDisplayName({ jobId, partName }: JobDisplayNameProps): string {
  const lotNumber = getLotNumberFromJobId(jobId);
  return lotNumber ? getPartNameWithLot(partName, lotNumber) : partName;
} 