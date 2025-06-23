import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Factory, AlertCircle } from 'lucide-react';

interface LotPlanningPreviewProps {
  partName: string;
  quantity: number;
  processes: string[];
  className?: string;
}

export function LotPlanningPreview({ 
  partName, 
  quantity, 
  processes, 
  className = "" 
}: LotPlanningPreviewProps) {
  if (!partName || quantity <= 0) {
    return null;
  }

  const isHighVolume = quantity > 5;
  const isAerospaceProcess = processes.some(p => 
    p.includes('5-Axis') || p.includes('Aerospace') || p.includes('Precision')
  );

  return (
    <Card className={`mt-2 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Factory className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Lot Planning Preview</span>
          {isAerospaceProcess && (
            <Badge variant="secondary" className="text-xs">
              Aerospace
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            <strong>Part:</strong> {partName}
          </div>
          
          <div className="text-sm text-muted-foreground">
            <strong>Order Quantity:</strong> {quantity} {quantity === 1 ? 'piece' : 'pieces'}
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <Package className="h-4 w-4 text-blue-600" />
            <div className="text-sm">
              <span className="font-medium text-blue-800">
                Will create {quantity} manufacturing {quantity === 1 ? 'lot' : 'lots'}:
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {Array.from({ length: Math.min(quantity, 5) }, (_, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {partName} (Lot {i + 1})
                  </Badge>
                ))}
                {quantity > 5 && (
                  <Badge variant="outline" className="text-xs">
                    ... and {quantity - 5} more lots
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {processes.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <strong>Manufacturing Process:</strong> {processes.slice(0, 2).join(', ')}
              {processes.length > 2 && ` (+${processes.length - 2} more)`}
            </div>
          )}

          {isHighVolume && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <div className="text-xs text-amber-700">
                <strong>High Volume Order:</strong> Consider batch scheduling for optimal efficiency
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
            <strong>Lot Benefits:</strong> Independent tracking, quality control per lot, no job conflicts when reordering
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 