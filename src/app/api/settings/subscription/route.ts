import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma, { withDBErrorHandling } from '@/lib/db';
import { z } from 'zod';

const updateSubscriptionSchema = z.object({
  plan: z.enum(['FREE', 'PLUS', 'PRO']),
  isYearly: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { plan, isYearly } = validation.data;

    // TODO: Integrate with payment provider (Stripe/LemonSqueezy) here.
    // For now, we directly update the user's plan.

    const { data: updatedUser, error: updateError } = await withDBErrorHandling(
      () => prisma.user.update({
        where: { id: session.user.id },
        data: {
          plan,
          subscriptionPeriod: isYearly ? 'YEARLY' : 'MONTHLY',
          // Reset subscription status if needed, or set to ACTIVE
          subscriptionStatus: 'ACTIVE', 
        },
        select: {
          plan: true,
        },
      })
    );

    if (updateError) {
      console.error('Subscription update error:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Subscription updated successfully', 
      plan: updatedUser?.plan 
    });

  } catch (error) {
    console.error('Subscription API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
