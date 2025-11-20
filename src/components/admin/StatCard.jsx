import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

const StatCard = ({ icon: Icon, title, value, change, changeLabel }) => (
    <Card className="glass-effect border-primary/20 shadow-lg rounded-xl">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-400">{title}</p>
                    <p className="text-2xl font-bold text-white">{value ?? 'N/A'}</p>
                </div>
                {Icon && <Icon className="w-8 h-8 text-primary" />}
            </div>
            {change !== null && change !== undefined && (
                <p className={`text-sm mt-2 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {change >= 0 ? <ArrowUp className="inline w-3 h-3" /> : <ArrowDown className="inline w-3 h-3" />}
                    {Math.abs(change)} {changeLabel}
                </p>
            )}
        </CardContent>
    </Card>
);

export default StatCard;