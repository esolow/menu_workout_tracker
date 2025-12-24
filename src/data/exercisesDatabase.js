// Exercise database organized by body part
// Video links are placeholders - replace with actual YouTube or video URLs

export const EXERCISES_BY_BODY_PART = {
  chest: {
    name: 'חזה',
    nameEn: 'Chest',
    exercises: [
      {
        id: 1,
        name: 'לחיצות חזה עם משקולות בשיפוע חיובי',
        nameEn: 'Chest Presses with Dumbbells on Positive Incline',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=incline+dumbbell+chest+press'
      },
      {
        id: 2,
        name: 'פרפר עם משקולות בשיפוע חיובי',
        nameEn: 'Flyes with Dumbbells on Positive Incline',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=incline+dumbbell+fly'
      },
      {
        id: 3,
        name: 'לחיצות חזה במכונה',
        nameEn: 'Chest Presses on Machine',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=chest+press+machine'
      },
      {
        id: 4,
        name: 'מקבילים עם גרביטון',
        nameEn: 'Dips with Graviton (Assisted Dips)',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=assisted+dips+graviton'
      }
    ]
  },
  middleShoulder: {
    name: 'כתף אמצעי',
    nameEn: 'Middle Shoulder',
    exercises: [
      {
        id: 1,
        name: 'הרחקת כתפיים עם משקולות',
        nameEn: 'Shoulder Raises with Dumbbells (Lateral Raises)',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=lateral+raise+dumbbell'
      },
      {
        id: 2,
        name: 'הרחקת כתפיים יד יד מפולי תחתון (בלי מנוחה)',
        nameEn: 'Single-Arm Shoulder Raises from Low Pulley (Without Rest)',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=cable+lateral+raise'
      }
    ]
  },
  triceps: {
    name: 'יד אחורית',
    nameEn: 'Triceps',
    exercises: [
      {
        id: 1,
        name: 'פשיטת מרפקים עם מוט V מפולי עליון',
        nameEn: 'Elbow Extensions with V-Bar from High Pulley',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=tricep+pushdown+v+bar'
      },
      {
        id: 2,
        name: 'פשיטת מרפקים מאחורי הראש עם מוט/כבל',
        nameEn: 'Elbow Extensions Behind Head with Bar/Cable',
        sets: 4,
        reps: '12',
        videoUrl: 'https://www.youtube.com/results?search_query=overhead+tricep+extension'
      },
      {
        id: 3,
        name: 'פשיטת מרפק יד יד בכבל מפולי עליון (בלי מנוחה)',
        nameEn: 'Single-Arm Elbow Extension with Cable from High Pulley (Without Rest)',
        sets: 4,
        reps: '8-10',
        videoUrl: 'https://www.youtube.com/results?search_query=single+arm+tricep+pushdown'
      },
      {
        id: 4,
        name: 'פשיטת מרפק בהטייה לפנים (KickBack)',
        nameEn: 'Tricep Kickbacks',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=tricep+kickback'
      }
    ]
  },
  back: {
    name: 'גב',
    nameEn: 'Back',
    exercises: [
      {
        id: 1,
        name: 'מתח באחיזה רחבה מפולי עליון',
        nameEn: 'Wide Grip Pull-ups from Upper Pulley',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=wide+grip+lat+pulldown'
      },
      {
        id: 2,
        name: 'חתירה במכונה',
        nameEn: 'Machine Row',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=seated+cable+row'
      },
      {
        id: 3,
        name: 'פול אובר בשכיבה על ספסל',
        nameEn: 'Lying Pullover on Bench',
        sets: 4,
        reps: '10-12',
        videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+pullover'
      },
      {
        id: 4,
        name: 'הרמת שכמות עם משקולות',
        nameEn: 'Shoulder Shrugs with Weights',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+shrug'
      }
    ]
  },
  rearShoulder: {
    name: 'כתף אחורית',
    nameEn: 'Rear Shoulder',
    exercises: [
      {
        id: 1,
        name: 'הרחקה אופקית במכונה',
        nameEn: 'Horizontal Abduction on Machine',
        sets: 4,
        reps: '12',
        videoUrl: 'https://www.youtube.com/results?search_query=rear+delt+machine+fly'
      },
      {
        id: 2,
        name: 'פייס פול',
        nameEn: 'Face Pull',
        sets: 3,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=face+pull'
      }
    ]
  },
  biceps: {
    name: 'יד קדמית',
    nameEn: 'Biceps',
    exercises: [
      {
        id: 1,
        name: 'כפיפת מרפקים עם מוט מופלי תחתון',
        nameEn: 'Elbow Flexion with Lower Pulley Bar',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=cable+bicep+curl'
      },
      {
        id: 2,
        name: 'כפיפת מרפקים בכיסא כומר',
        nameEn: 'Preacher Curls',
        sets: 4,
        reps: '8',
        videoUrl: 'https://www.youtube.com/results?search_query=preacher+curl'
      },
      {
        id: 3,
        name: 'פטישים עם משקולות',
        nameEn: 'Hammer Curls with Weights',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=hammer+curl'
      },
      {
        id: 4,
        name: 'כפיפת מרפקים עם מוט W (סופינציה)',
        nameEn: 'Bicep Curls with W-Bar (Supination)',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=ez+bar+bicep+curl'
      },
      {
        id: 5,
        name: 'כפיפת מרפקים עם משקולות בישיבה בשיפוע חיובי',
        nameEn: 'Bicep Curls with Dumbbells on Incline Bench',
        sets: 4,
        reps: '12',
        videoUrl: 'https://www.youtube.com/results?search_query=incline+dumbbell+curl'
      },
      {
        id: 6,
        name: 'פטישים בעמידה/ישיבה עם משקולות',
        nameEn: 'Hammer Curls Standing/Sitting with Dumbbells',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=hammer+curl+standing'
      }
    ]
  },
  abs: {
    name: 'בטן',
    nameEn: 'Abs',
    exercises: [
      {
        id: 1,
        name: 'כפיפות בטן מספסל בשיפוע שלילי',
        nameEn: 'Sit-ups on Decline Bench',
        sets: 3,
        reps: '30',
        videoUrl: 'https://www.youtube.com/results?search_query=decline+bench+crunches'
      },
      {
        id: 2,
        name: 'הרמת רגליים בתלייה על מתח/בריצפה',
        nameEn: 'Leg Raises Hanging from Pull-up Bar/on Floor',
        sets: 3,
        reps: '30',
        videoUrl: 'https://www.youtube.com/results?search_query=hanging+leg+raise'
      },
      {
        id: 3,
        name: 'פינגווין (נגיעות עקבים בצדדים בשכיבה)',
        nameEn: 'Penguin (Heel Touches to Sides While Lying Down)',
        sets: 3,
        reps: '30',
        videoUrl: 'https://www.youtube.com/results?search_query=heel+touch+ab+exercise'
      }
    ]
  },
  quadriceps: {
    name: 'ארבע ראשי',
    nameEn: 'Quadriceps',
    exercises: [
      {
        id: 1,
        name: 'פשיטת ברכיים במכונה',
        nameEn: 'Knee Extension Machine',
        sets: 4,
        reps: '12-15',
        videoUrl: 'https://www.youtube.com/results?search_query=leg+extension+machine'
      },
      {
        id: 2,
        name: 'האק סקוואט',
        nameEn: 'Hack Squat',
        sets: 4,
        reps: '8-10',
        videoUrl: 'https://www.youtube.com/results?search_query=hack+squat'
      },
      {
        id: 3,
        name: 'לחיצת רגליים',
        nameEn: 'Leg Press',
        sets: 4,
        reps: '10',
        videoUrl: 'https://www.youtube.com/results?search_query=leg+press'
      }
    ]
  },
  hamstrings: {
    name: 'האמסטרינגס',
    nameEn: 'Hamstrings',
    exercises: [
      {
        id: 1,
        name: 'כפיפת ברכיים במכונה',
        nameEn: 'Knee Curl Machine (Leg Curl)',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=leg+curl+machine'
      },
      {
        id: 2,
        name: 'סטיף לג',
        nameEn: 'Stiff Leg Deadlift',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=stiff+leg+deadlift'
      },
      {
        id: 3,
        name: 'היפטראס במכונה',
        nameEn: 'Hip Thrust Machine',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=hip+thrust+machine'
      }
    ]
  },
  calves: {
    name: 'תאומים',
    nameEn: 'Calves',
    exercises: [
      {
        id: 1,
        name: 'הרמת תאומים בסמיט',
        nameEn: 'Calf Raises on Smith Machine',
        sets: 4,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=smith+machine+calf+raise'
      },
      {
        id: 2,
        name: 'הרמת תאומים בישיבה',
        nameEn: 'Seated Calf Raises',
        sets: 3,
        reps: '15',
        videoUrl: 'https://www.youtube.com/results?search_query=seated+calf+raise'
      }
    ]
  }
};

// Get all body parts as an array
export const BODY_PARTS = Object.keys(EXERCISES_BY_BODY_PART).map(key => ({
  key,
  ...EXERCISES_BY_BODY_PART[key]
}));

