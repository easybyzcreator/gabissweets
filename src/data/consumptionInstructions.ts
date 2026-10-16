export type InstructionId = 'cake' | 'caseirinhos' | 'brigadeiros';
export type InstructionLang = 'pt' | 'en';

export interface InstructionSection {
  heading: string;
  icon?: string;
  paragraphs: string[];
}

export interface InstructionItemData {
  id: InstructionId;
  icon: string;
  badge: { pt: string; en: string };
  title: { pt: string; en: string };
  subtitle: { pt: string; en: string };
  intro: { pt: string; en: string };
  sections: {
    pt: InstructionSection[];
    en: InstructionSection[];
  };
  importantNotice?: { pt: string; en: string };
  signoff: { pt: string; en: string };
}

export const CONSUMPTION_INSTRUCTIONS: InstructionItemData[] = [
  {
    id: 'cake',
    icon: '🎂',
    badge: { pt: 'Bolos & Tortas', en: 'Cakes & Tortes' },
    title: { pt: 'Cuidados com o seu bolo', en: 'Cake Care Guide' },
    subtitle: { 
      pt: 'Orientações para manter seu bolo lindo, seguro e saboroso', 
      en: 'Guidelines to keep your cake gorgeous, fresh, and delicious' 
    },
    intro: {
      pt: 'Seu bolo foi preparado com muito carinho. Para que ele chegue à mesa lindo e perfeito, siga estas orientações:',
      en: 'Your cake was prepared with great care and love. To ensure it arrives at your table looking and tasting perfect, please follow these guidelines:'
    },
    sections: {
      pt: [
        {
          heading: 'Transporte',
          icon: '🚗',
          paragraphs: [
            'Mantenha o bolo sempre em uma superfície reta e nivelada. No carro, o lugar mais seguro é no chão, de preferência com o ar-condicionado ligado.',
            'Não transporte o bolo no banco ou no colo, pois ele pode inclinar durante o trajeto.'
          ]
        },
        {
          heading: 'Ao chegar em casa',
          icon: '❄️',
          paragraphs: [
            'Leve o bolo diretamente para a geladeira dentro da caixa de preferência, e mantenha-o refrigerado até próximo do momento de servir.'
          ]
        },
        {
          heading: 'Antes de servir',
          icon: '🍰',
          paragraphs: [
            'Retire o bolo da geladeira aproximadamente 30 a 60 minutos antes de servir, dependendo da temperatura do ambiente. Assim, o recheio e a massa ficam mais macios e saborosos.',
            'O bolo terá uma pequena blindagem de chocolate na lateral para que ele se sustente por mais tempo e fique perfeito na mesa até os parabéns.',
            'Se por algum motivo, a calda começar a escorrer no prato, encoste um guardanapo para sugar o excesso.'
          ]
        },
        {
          heading: 'Atenção ao calor',
          icon: '☀️',
          paragraphs: [
            'Nunca deixe o bolo exposto ao sol, dentro do carro parado ou próximo a fontes de calor. Bolos decorados são sensíveis a altas temperaturas.'
          ]
        },
        {
          heading: 'Depois de cortar',
          icon: '📦',
          paragraphs: [
            'Se sobrar, guarde o restante do bolo bem fechado em vasilhas e refrigerado. Assim você terá bolo perfeito por mais 4 dias se não tiver frutas frescas. Com morangos a validade é muito menor.'
          ]
        }
      ],
      en: [
        {
          heading: 'Transportation',
          icon: '🚗',
          paragraphs: [
            'Always keep the cake on a completely flat, level surface. In the car, the safest place is on the floor, ideally with the air conditioning on.',
            'Do not transport the cake on seats or on your lap, as it may tilt or shift during the ride.'
          ]
        },
        {
          heading: 'Upon arriving home',
          icon: '❄️',
          paragraphs: [
            'Place the cake directly into the refrigerator, preferably inside its box, and keep it chilled until close to serving time.'
          ]
        },
        {
          heading: 'Before serving',
          icon: '🍰',
          paragraphs: [
            'Remove the cake from the refrigerator approximately 30 to 60 minutes before serving, depending on room temperature. This allows the sponge and fillings to become soft and intensely flavorful.',
            'The cake has a delicate chocolate outer seal to help maintain its structure and beauty until celebration time.',
            'If any syrup gently runs onto the plate or cake board, simply dab the excess with a paper napkin.'
          ]
        },
        {
          heading: 'Beware of heat',
          icon: '☀️',
          paragraphs: [
            'Never leave the cake exposed to direct sunlight, inside a parked car, or near heat sources. Decorated cakes are very sensitive to warm temperatures.'
          ]
        },
        {
          heading: 'After slicing',
          icon: '📦',
          paragraphs: [
            'If you have leftovers, store them tightly sealed in an airtight container in the refrigerator. Your cake will remain delicious for up to 4 days (cakes with fresh strawberries or fresh fruits should be enjoyed sooner).'
          ]
        }
      ]
    },
    importantNotice: {
      pt: 'Importante: após a retirada ou entrega, o armazenamento e o transporte adequado do bolo passam a ser responsabilidade do cliente.',
      en: 'Important: once picked up or delivered, proper transport and storage become the customer\'s responsibility.'
    },
    signoff: {
      pt: 'Com carinho,\n{brandName} 🤎',
      en: 'With love,\n{brandName} 🤎'
    }
  },
  {
    id: 'caseirinhos',
    icon: '🍞',
    badge: { pt: 'Caseirinhos & Bolos', en: 'Loaf Cakes & Tea Cakes' },
    title: { pt: 'Caseirinhos Tradicionais / Gluten Free', en: 'Traditional & Gluten-Free Loaf Cakes' },
    subtitle: { 
      pt: 'Instruções para desfrutar da melhor textura, aroma e maciez', 
      en: 'Tips to enjoy optimal softness, crumb texture, and fresh flavor' 
    },
    intro: {
      pt: 'Preparamos nossos bolos artesanais com ingredientes selecionados para proporcionar uma experiência inesquecível:',
      en: 'Our artisanal cakes are freshly baked with fine ingredients for an unforgettable homemade experience:'
    },
    sections: {
      pt: [
        {
          heading: 'Caseirinhos Tradicionais',
          icon: '🧁',
          paragraphs: [
            'Para aproveitar seu caseirinho com a melhor textura e sabor:',
            '• Conservação: mantenha em local fresco, seco e protegido do sol. Caso o bolo tenha cobertura ou recheio que necessite refrigeração, mantenha-o na geladeira.',
            '• Para consumir: se estiver refrigerado, retire da geladeira cerca de 20 a 30 minutos antes de servir. Em temperatura ambiente, o bolo recupera sua maciez e sabor.',
            '• Dica de ouro: para aquela sensação de bolo recém-feito, aqueça uma fatia por alguns segundos no micro-ondas. Fica ainda mais macio e delicioso. 🤎',
            '• Após aberto, mantenha sempre bem fechado para evitar que o bolo resseque.'
          ]
        },
        {
          heading: 'Caseirinhos Gluten Free',
          icon: '🌾',
          paragraphs: [
            'Os nossos caseirinhos Gluten Free são preparados com uma combinação especial de farinhas sem glúten. Por isso, sua textura e conservação podem ser um pouco diferentes dos bolos tradicionais.',
            '• Conservação: mantenha o bolo bem fechado para preservar sua umidade e maciez. Caso esteja refrigerado, retire da geladeira cerca de 20 a 30 minutos antes do consumo.',
            '• Para uma textura ainda melhor: aqueça a fatia por alguns segundos no micro-ondas antes de consumir. O aquecimento ajuda a devolver a maciez e deixa o bolo ainda mais gostoso.',
            '• Importante: se você possui doença celíaca ou alergia severa, consulte as informações de produção e possíveis riscos de contaminação cruzada antes do consumo.',
            '• Após aberto, mantenha sempre bem fechado e consuma dentro do período indicado na embalagem.'
          ]
        }
      ],
      en: [
        {
          heading: 'Traditional Loaf Cakes',
          icon: '🧁',
          paragraphs: [
            'To enjoy your everyday homemade loaf cake at its peak texture and flavor:',
            '• Storage: keep in a cool, dry place protected from sunlight. If your cake has a cream topping or filling that requires chilling, store it in the refrigerator.',
            '• To serve: if refrigerated, remove from the fridge approximately 20 to 30 minutes before serving. At room temperature, the cake restores its natural crumb softness and moisture.',
            '• Chef\'s Tip: for that warm, fresh-out-of-the-oven bliss, warm a slice for a few seconds in the microwave. It becomes irresistibly soft! 🤎',
            '• Once opened, keep tightly wrapped to prevent the cake from drying out.'
          ]
        },
        {
          heading: 'Gluten-Free Loaf Cakes',
          icon: '🌾',
          paragraphs: [
            'Our Gluten-Free cakes are made with a delicate blend of premium gluten-free flours. Because of this, their texture and storage may differ slightly from wheat-based cakes.',
            '• Storage: keep the cake well-sealed to preserve moisture and tenderness. If chilled, let it rest at room temperature for 20 to 30 minutes before eating.',
            '• For an even better texture: warm your slice in the microwave for a few seconds before serving. Gentle warmth revives the crumb and heightens the flavor.',
            '• Important: if you have celiac disease or severe allergies, please review production details and cross-contamination notes prior to consumption.',
            '• Once opened, keep sealed and enjoy within the freshness period indicated.'
          ]
        }
      ]
    },
    signoff: {
      pt: 'Com carinho,\n{brandName} 🤎',
      en: 'With love,\n{brandName} 🤎'
    }
  },
  {
    id: 'brigadeiros',
    icon: '🍫',
    badge: { pt: 'Doces Gourmet', en: 'Gourmet Treats' },
    title: { pt: 'Brigadeiros', en: 'Gourmet Brigadeiros' },
    subtitle: { 
      pt: 'Como conservar e degustar seus doces com máxima cremosidade', 
      en: 'How to store and enjoy your brigadeiros with peak velvety texture' 
    },
    intro: {
      pt: 'Para aproveitar seus brigadeiros com a melhor textura e sabor:',
      en: 'To enjoy your brigadeiros with their authentic melt-in-your-mouth flavor and velvety texture:'
    },
    sections: {
      pt: [
        {
          heading: 'Conservação e Armazenamento',
          icon: '❄️',
          paragraphs: [
            '• Conservação: mantenha-os em local fresco e protegido do calor por até 24 horas. Para períodos maiores, conserve-os refrigerados, sempre em embalagem bem fechada.'
          ]
        },
        {
          heading: 'Antes de Servir',
          icon: '✨',
          paragraphs: [
            '• Antes de consumir: se estiverem na geladeira, retire-os aproximadamente 30 minutos antes de servir. Em temperatura ambiente, o brigadeiro fica mais macio, cremoso e saboroso.'
          ]
        },
        {
          heading: 'Cuidado com Calor e Sol',
          icon: '☀️',
          paragraphs: [
            '• Evite calor e sol: não deixe os brigadeiros dentro do carro ou expostos a temperaturas altas, pois podem amolecer e perder o formato, por serem feitos com chocolate nobre.',
            '• Após aberto, mantenha a embalagem bem fechada e consuma dentro do período indicado.'
          ]
        }
      ],
      en: [
        {
          heading: 'Storage & Freshness',
          icon: '❄️',
          paragraphs: [
            '• Storage: keep in a cool, dry place away from heat for up to 24 hours. For longer periods, store refrigerated inside a tightly sealed container.'
          ]
        },
        {
          heading: 'Before Serving',
          icon: '✨',
          paragraphs: [
            '• Before consuming: if kept in the refrigerator, take them out approximately 30 minutes before serving. At room temperature, brigadeiros restore their signature silky smoothness and rich flavor.'
          ]
        },
        {
          heading: 'Avoid Sun and Heat',
          icon: '☀️',
          paragraphs: [
            '• Avoid heat and direct sunlight: never leave brigadeiros inside a parked car or in warm spaces. Handcrafted with fine gourmet chocolate, heat can soften them and cause them to lose their shape.',
            '• Once opened, keep container sealed and consume within the indicated freshness window.'
          ]
        }
      ]
    },
    signoff: {
      pt: 'Com carinho,\n{brandName} 🤎',
      en: 'With love,\n{brandName} 🤎'
    }
  }
];

export function buildInstructionWhatsAppMessage(
  instructionId: InstructionId,
  lang: InstructionLang,
  brandName: string,
  customerName?: string
): string {
  const item = CONSUMPTION_INSTRUCTIONS.find(i => i.id === instructionId) || CONSUMPTION_INSTRUCTIONS[0];
  const safeBrand = brandName || 'Andréia Cakes';
  const greeting = customerName ? (lang === 'pt' ? `Olá, *${customerName}*! 👋` : `Hello, *${customerName}*! 👋`) : (lang === 'pt' ? 'Olá! 👋' : 'Hello! 👋');

  let text = `${greeting}\n\n`;

  if (lang === 'pt') {
    text += `✨ *INSTRUÇÕES DE CONSUMO - ${item.title.pt.toUpperCase()}* ✨\n\n`;
    text += `${item.intro.pt}\n\n`;

    item.sections.pt.forEach(sec => {
      text += `*${sec.icon ? `${sec.icon} ` : ''}${sec.heading.toUpperCase()}*\n`;
      sec.paragraphs.forEach(p => {
        text += `${p}\n`;
      });
      text += `\n`;
    });

    if (item.importantNotice?.pt) {
      text += `⚠️ *${item.importantNotice.pt}*\n\n`;
    }

    text += item.signoff.pt.replace('{brandName}', safeBrand);
  } else {
    text += `✨ *CARE & CONSUMPTION GUIDE - ${item.title.en.toUpperCase()}* ✨\n\n`;
    text += `${item.intro.en}\n\n`;

    item.sections.en.forEach(sec => {
      text += `*${sec.icon ? `${sec.icon} ` : ''}${sec.heading.toUpperCase()}*\n`;
      sec.paragraphs.forEach(p => {
        text += `${p}\n`;
      });
      text += `\n`;
    });

    if (item.importantNotice?.en) {
      text += `⚠️ *${item.importantNotice.en}*\n\n`;
    }

    text += item.signoff.en.replace('{brandName}', safeBrand);
  }

  return text;
}
