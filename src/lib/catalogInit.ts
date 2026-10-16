import { db } from '../firebase';
import { doc, getDoc, setDoc, getDocs, collection, arrayUnion } from 'firebase/firestore';
import { initialCategories, initialProducts, initialGalleries, DEFAULT_CAKE_CONFIG } from '../data/defaultCatalog';
import { cleanFirestoreData } from './utils';

let isSeeding = false;

export async function ensureDefaultCatalogSeeded() {
  if (isSeeding) return;
  isSeeding = true;

  try {
    const setupDocRef = doc(db, 'configuracoes', 'app_setup');
    const setupSnap = await getDoc(setupDocRef);
    const setupData = setupSnap.exists() ? setupSnap.data() : null;

    // Check if bakery catalog was already seeded
    if (setupData?.bakerySeeded) {
      return;
    }

    // Check categories and products
    const catSnap = await getDocs(collection(db, 'categorias'));
    const prodSnap = await getDocs(collection(db, 'produtos'));
    const galSnap = await getDocs(collection(db, 'galerias'));

    // Check if there are existing products with marmitas or if it's empty
    const hasExistingCake = prodSnap.docs.some(d => {
      const p = d.data();
      return p.isCustomCake || (p.title && p.title.toLowerCase().includes('cake'));
    });

    // Keep menu completely dynamic - no hardcoded/seeded products
    if (galSnap.docs.length === 0) {
      for (const gal of initialGalleries) {
        await setDoc(doc(db, 'galerias', gal.id), cleanFirestoreData(gal), { merge: true });
      }
    }

    // Ensure configuracoes/geral has bakery defaults if not set
    const generalDocRef = doc(db, 'configuracoes', 'geral');
    const generalSnap = await getDoc(generalDocRef);
    const currentGeneral = generalSnap.exists() ? generalSnap.data() : {};

    const bakerySettingsUpdates: Record<string, any> = {};

    if (!currentGeneral.brandName || currentGeneral.brandName === 'EGN' || currentGeneral.brandName === 'Marmitaria' || currentGeneral.brandName === 'Andréia Cakes USA') {
      bakerySettingsUpdates.brandName = 'Gabi´s sweets';
      bakerySettingsUpdates.pwaIcon = 'https://i.ibb.co/TqdtdsC8/Whats-App-Image-2026-10-112-at-5-43-28-PM.jpg';
      bakerySettingsUpdates.slogan = 'Custom & Artisanal Cakes and Sweets';
      bakerySettingsUpdates.logo = 'https://i.ibb.co/TqdtdsC8/Whats-App-Image-2026-10-112-at-5-43-28-PM.jpg';
      bakerySettingsUpdates.currency = 'USD';
      bakerySettingsUpdates.language = 'en';
      bakerySettingsUpdates.primaryColor = '#865d39';
      bakerySettingsUpdates.whatsappCountryCode = '+1';
      bakerySettingsUpdates.backgroundImage = 'https://i.ibb.co/X0vYy7L/cakes.png';
      bakerySettingsUpdates.tagLogo = 'https://i.ibb.co/1YHhXv0b/patitour-2026-10-13-T110847-317.png';
      bakerySettingsUpdates.tagUrl = 'https://www.instagram.com/gabissweets/';
      bakerySettingsUpdates.showCustomDietButton = false;
    }

    if (Object.keys(bakerySettingsUpdates).length > 0) {
      await setDoc(generalDocRef, bakerySettingsUpdates, { merge: true });
    }

    // Ensure configuracoes/chef_courses exists with default links
    const chefCoursesDocRef = doc(db, 'configuracoes', 'chef_courses');
    const chefCoursesSnap = await getDoc(chefCoursesDocRef);
    if (!chefCoursesSnap.exists()) {
      await setDoc(chefCoursesDocRef, {
        mainCourseLink: 'https://andreiacakesusa.com/cursos',
        links: {
          'bem-casado': 'https://andreiacakesusa.com/cursos',
          'brigadeiro-gourmet': 'https://andreiacakesusa.com/cursos',
          'caseirinhos': 'https://andreiacakesusa.com/cursos',
          'sem-gluten': 'https://andreiacakesusa.com/cursos',
          'brownies': 'https://andreiacakesusa.com/cursos',
          'pudins': 'https://andreiacakesusa.com/cursos',
          'bolos-no-pote': 'https://andreiacakesusa.com/cursos',
          'cupcakes': 'https://andreiacakesusa.com/cursos',
          'planilha-precificacao': 'https://andreiacakesusa.com/cursos'
        }
      }, { merge: true });
    }

    // Mark as seeded
    await setDoc(setupDocRef, {
      seeded: true,
      bakerySeeded: true,
      seededAt: new Date().toISOString()
    }, { merge: true });

  } catch (err) {
    console.warn('ensureDefaultCatalogSeeded error:', err);
  } finally {
    isSeeding = false;
  }
}

export async function markCategoryAsDeleted(id: string) {
  try {
    await setDoc(doc(db, 'configuracoes', 'app_setup'), {
      deletedCategoryIds: arrayUnion(id)
    }, { merge: true });
  } catch (e) {
    console.warn('Error marking category as deleted:', e);
  }
}

export async function markProductAsDeleted(id: string) {
  try {
    await setDoc(doc(db, 'configuracoes', 'app_setup'), {
      deletedProductIds: arrayUnion(id)
    }, { merge: true });
  } catch (e) {
    console.warn('Error marking product as deleted:', e);
  }
}
