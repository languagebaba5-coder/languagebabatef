const { prisma } = require('./client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Ensure DATABASE_URL is available from environment variables
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // Get or create default admin user
  let adminUser = await prisma.user.findFirst({
    where: { email: 'admin@languagebaba.com' }
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    adminUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        username: 'admin',
        email: 'admin@languagebaba.com',
        passwordHash: hashedPassword,
        fullName: 'Language Baba Admin',
        role: 'superuser',
        isActive: true,
      },
    });
    console.log('✅ Admin user created:', adminUser.email);
  } else {
    console.log('✅ Using existing admin user:', adminUser.email);
  }

  // Create sample benefits
  const benefits = [
    {
      title: 'Personal Attention',
      description: 'With only 5-8 students, every individual gets focused attention from expert instructors. No student is left behind.',
      icon: '👥',
      orderIndex: 1,
    },
    {
      title: 'Interactive Learning',
      description: 'Small groups enable active participation, discussions, and comfortable speaking practice for better French fluency.',
      icon: '🗣️',
      orderIndex: 2,
    },
    {
      title: 'Faster Progress',
      description: 'Customized pace based on group needs ensures rapid improvement and efficient TEF Canada preparation.',
      icon: '⚡',
      orderIndex: 3,
    },
    {
      title: 'Confidence Building',
      description: 'Comfortable environment to practice speaking and ask questions without hesitation or embarrassment.',
      icon: '💪',
      orderIndex: 4,
    },
    {
      title: 'Proven Results',
      description: '95% of our small batch students achieve their target TEF Canada scores for successful Canada PR applications.',
      icon: '🏆',
      orderIndex: 5,
    },
    {
      title: 'Expert Instructors',
      description: 'Certified French teachers with specialized TEF Canada training and years of successful student outcomes.',
      icon: '👨‍🏫',
      orderIndex: 6,
    },
  ];

  for (const benefit of benefits) {
    const existingBenefit = await prisma.benefit.findFirst({
      where: { title: benefit.title }
    });
    
    if (!existingBenefit) {
      await prisma.benefit.create({
        data: {
          id: uuidv4(),
          ...benefit,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      });
    } else {
      console.log(`Benefit "${benefit.title}" already exists, skipping...`);
    }
  }

  console.log('✅ Benefits created');

  // Create sample testimonials
  const testimonials = [
    {
      name: 'Priya Sharma',
      designation: 'TEF 350+ | Mumbai',
      content: 'The small batch size made all the difference! With only 6 students in my group, I got personal attention and my French improved rapidly. Got my Canada PR approved!',
      rating: 5,
      isFeatured: true,
      orderIndex: 1,
    },
    {
      name: 'Raj Patel',
      designation: 'TEF 330+ | Delhi',
      content: 'Language Baba\'s small batch approach is amazing. I was comfortable asking questions and practicing with just 7 other students. The teacher knew everyone\'s strengths and weaknesses.',
      rating: 5,
      isFeatured: true,
      orderIndex: 2,
    },
    {
      name: 'Meera Singh',
      designation: 'TEF 340+ | Bangalore',
      content: 'The 8-student batch was perfect. Not too small to be boring, not too large to lose focus. Every student got individual feedback and support. Living in Canada now!',
      rating: 5,
      isFeatured: true,
      orderIndex: 3,
    },
  ];

  for (const testimonial of testimonials) {
    const existingTestimonial = await prisma.testimonial.findFirst({
      where: { name: testimonial.name }
    });
    
    if (!existingTestimonial) {
      await prisma.testimonial.create({
        data: {
          id: uuidv4(),
          ...testimonial,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      });
    } else {
      console.log(`Testimonial "${testimonial.name}" already exists, skipping...`);
    }
  }

  console.log('✅ Testimonials created');

  // Create sample FAQs
  const faqs = [
    {
      question: 'Why do you limit classes to only 5-8 students?',
      answer: 'Small batch sizes ensure every student receives personalized attention, immediate feedback, and focused support. This leads to faster learning, better TEF Canada scores, and higher success rates compared to large classes of 20-30 students.',
      category: 'general',
      orderIndex: 1,
    },
    {
      question: 'What is TEF Canada and why is it important?',
      answer: 'TEF Canada is a French proficiency test accepted by Immigration, Refugees and Citizenship Canada (IRCC) for immigration purposes. It can significantly boost your CRS score for Express Entry and help you achieve your Canadian permanent residency faster.',
      category: 'general',
      orderIndex: 2,
    },
    {
      question: 'Which program should I choose - 7 months or 10 months?',
      answer: 'The 7-month program is ideal if you have some basic French knowledge. The 10-month program is perfect for complete beginners or those who want more comprehensive preparation with individual coaching sessions in our small batch environment.',
      category: 'programs',
      orderIndex: 3,
    },
    {
      question: 'What is your success rate with small batches?',
      answer: '95% of our students achieve their target TEF Canada scores. Our small batch approach with just 5-8 students per class ensures personalized attention, immediate doubt resolution, and proven results for Canadian immigration success.',
      category: 'general',
      orderIndex: 4,
    },
    {
      question: 'What is included in the course materials?',
      answer: 'Both programs include comprehensive study materials, practice tests, audio recordings, grammar guides, vocabulary lists, and access to online resources specifically designed for TEF Canada preparation. All materials are FREE with enrollment.',
      category: 'programs',
      orderIndex: 5,
    },
  ];

  for (const faq of faqs) {
    const existingFaq = await prisma.faq.findFirst({
      where: { question: faq.question }
    });
    
    if (!existingFaq) {
      await prisma.faq.create({
        data: {
          id: uuidv4(),
          ...faq,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      });
    } else {
      console.log(`FAQ "${faq.question}" already exists, skipping...`);
    }
  }

  console.log('✅ FAQs created');

  // Create pricing plans
  const pricingPlans = [
    {
      title: 'Demo Class',
      price: '₹800',
      badge: '5-8 Students Only',
      features: [
        'Experience small batch teaching',
        'Meet our expert instructors',
        'Understand TEF format',
        'Ask unlimited questions',
        'No commitment required'
      ],
      buttonText: '💬 Book Demo via WhatsApp',
      buttonType: 'demo',
      orderIndex: 1,
    },
    {
      title: '7-Month Program',
      price: '₹77,000',
      badge: 'Only 5-8 Students',
      features: [
        'Exclusive 5-8 student batches',
        'Complete TEF Canada preparation',
        'Personal attention guaranteed',
        'FREE course materials',
        'Mock tests and evaluations',
        'WhatsApp support group'
      ],
      buttonText: '💬 Join 7-Month Program',
      buttonType: 'sevenMonth',
      isPopular: true,
      orderIndex: 2,
    },
    {
      title: '10-Month Elite Program',
      price: '₹80,000',
      badge: 'Maximum 8 Students',
      features: [
        'Premium small batch experience',
        'Extended preparation time',
        'Individual coaching sessions',
        'FREE comprehensive materials',
        'Unlimited practice tests',
        'Personal mentor support',
        'Success guarantee'
      ],
      buttonText: '💬 Join 10-Month Program',
      buttonType: 'tenMonth',
      orderIndex: 3,
    },
  ];

  for (const plan of pricingPlans) {
    const existingPlan = await prisma.pricingPlan.findFirst({
      where: { title: plan.title }
    });
    
    if (!existingPlan) {
      await prisma.pricingPlan.create({
        data: {
          id: uuidv4(),
          ...plan,
          createdById: adminUser.id,
          updatedById: adminUser.id,
        },
      });
    } else {
      console.log(`Pricing plan "${plan.title}" already exists, skipping...`);
    }
  }

  console.log('✅ Pricing plans created');

  // Create default settings
  const settings = [
    {
      settingKey: 'site_title',
      settingValue: 'Language Baba - TEF Canada Small Batch Excellence',
      settingType: 'text',
      description: 'Main site title',
    },
    {
      settingKey: 'site_description',
      settingValue: 'Master TEF Canada with Language Baba\'s exclusive small batch classes. Only 5-8 students per batch for personalized attention. 95% success rate, expert instructors.',
      settingType: 'textarea',
      description: 'Main site description',
    },
    {
      settingKey: 'contact_phone',
      settingValue: '+91-7303619158',
      settingType: 'text',
      description: 'Contact phone number',
    },
    {
      settingKey: 'contact_email',
      settingValue: 'languagebaba5@gmail.com',
      settingType: 'email',
      description: 'Contact email address',
    },
    {
      settingKey: 'whatsapp_number',
      settingValue: '+91-7303619158',
      settingType: 'text',
      description: 'WhatsApp contact number',
    },
  ];

  for (const setting of settings) {
    const existingSetting = await prisma.setting.findFirst({
      where: { settingKey: setting.settingKey }
    });
    
    if (!existingSetting) {
      await prisma.setting.create({
        data: {
          id: uuidv4(),
          ...setting,
          updatedById: adminUser.id,
        },
      });
    } else {
      console.log(`Setting "${setting.settingKey}" already exists, skipping...`);
    }
  }

  console.log('✅ Settings created');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
