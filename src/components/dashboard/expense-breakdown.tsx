import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";
import { useI18n } from '@/context/i18n-context';

interface ExpenseBreakdownProps {
  chartData: any[];
  chartConfig: ChartConfig;
  totalExpenses: number;
}

export const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({ chartData, chartConfig, totalExpenses }) => {
    const { t } = useI18n();

    return (
        <Card className="lg:col-span-3 shadow-sm md:order-2 overflow-x-auto">
            <CardHeader>
                <CardTitle className="font-headline">{t('dashboard.breakdown_title')}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {totalExpenses > 0 ? (
                <div className="flex flex-col items-center gap-6">
                  <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px] w-full"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={chartData}
                        dataKey="amount"
                        nameKey="category"
                        innerRadius={60}
                        strokeWidth={5}
                        labelLine={false}
                        label={false}
                      >
                        {chartData.map((entry) => (
                          <Cell
                            key={`cell-${entry.category}`}
                            fill={entry.fill}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="w-full flex flex-col gap-3 text-sm">
                    <div className="font-medium text-muted-foreground">{t('dashboard.top_categories')}</div>
                    {chartData
                        .sort((a,b) => b.amount - a.amount)
                        .slice(0, 5)
                        .map((entry) => (
                      <div key={entry.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: chartConfig[entry.category as keyof typeof chartConfig]?.color }}
                          />
                          <span className="truncate">{t(`categories.${entry.category}`)}</span>
                        </div>
                        <span className="font-medium">{entry.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-[300px] flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground">{t('dashboard.no_expense_data')}</p>
                    <p className="text-sm text-muted-foreground">{t('dashboard.add_expense_prompt')}</p>
                </div>
              )}
            </CardContent>
        </Card>
    );
};
