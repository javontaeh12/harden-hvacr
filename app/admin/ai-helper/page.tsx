'use client';

import { ChatInterface } from '@/components/ChatInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { MessageSquare } from 'lucide-react';

export default function AIHelperPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Troubleshooting Helper</h1>
        <p className="text-gray-600 mt-1">
          Get expert assistance with HVAC and refrigeration issues
        </p>
      </div>

      <Card className="h-[calc(100vh-12rem)] sm:h-[calc(100vh-14rem)]">
        <CardContent className="h-full pt-4 sm:pt-6 px-3 sm:px-6">
          <ChatInterface />
        </CardContent>
      </Card>
    </div>
  );
}
