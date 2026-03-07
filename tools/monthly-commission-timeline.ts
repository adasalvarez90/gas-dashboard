import { CommissionPaymentDraft } from '../src/app/models/commission-engine.model';

export class MonthlyCommissionTimeline {

    generateTimeline(payments: CommissionPaymentDraft[]) {

        console.log('\n==============================');
        console.log('MONTHLY COMMISSION TIMELINE');
        console.log('==============================');

        const months: Record<number, number> = {};

        payments.forEach(payment => {

            const month = this.getMonthKey(payment.dueDate);

            if (!months[month]) {
                months[month] = 0;
            }

            months[month] += payment.amount;

        });

        const sortedMonths =
            Object.keys(months)
                .map(Number)
                .sort((a, b) => a - b);

        const timeline = sortedMonths.map(month => ({
            month,
            amount: months[month]
        }));

        console.table(timeline);

        return timeline;
    }

    private getMonthKey(timestamp: number): number {

        const date = new Date(timestamp);

        return date.getFullYear() * 100 + (date.getMonth() + 1);
    }

}