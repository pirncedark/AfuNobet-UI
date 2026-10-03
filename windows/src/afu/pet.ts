import { PET_PENCERE } from "../core/layout";

import { h } from "../views/dom";
import "../apps.css";
import { appRows, type AppsSnapshot } from "../core/apps";
import type { AfuEvent } from "../core/events";
import { Bridge, onEvent } from "../core/bridge";
import { TUVAL_BOYUTU, WebpOynatici, tuvalCizici } from "./oynatma";
import { IfadeZamanlayici } from "./ifade";
import { PET_IFADE_OLAYI, loadPetIfade } from "../core/settings";
export type PetPose = "donus" | "bekleme" | "gecis" | "uyanma" | "dusunme" | "uyari" | "hata" | "mutlu" | "basari" | "uyku" | "yuzme" | "etkilesim" | "surukleme" | "geri_donus" | "yaslanma";
export const SEKANSLAR: Record<PetPose, { kare: string; ms: number }[]> = {
  "donus": [{ kare: "akis_tutunma", ms: 120 }, { kare: "akis_gorunme", ms: 200 }, { kare: "akis_suzulme", ms: 250 }, { kare: "akis_kuculme", ms: 180 }, { kare: "durum/masa_cikis", ms: 1000 }],
  "bekleme": [{ kare: "durum/bekleme", ms: 500 }, { kare: "durum/bekleme", ms: 500 }, { kare: "durum/bekleme", ms: 500 }],
  "gecis": [{ kare: "durum/ucus", ms: 500 }, { kare: "durum/masa_cikis", ms: 500 }, { kare: "durum/kalkis", ms: 500 }],
  "uyanma": [{ kare: "durum/masa_cikis", ms: 500 }],
  "dusunme": [{ kare: "durum/dusunme", ms: 500 }],
  "uyari": [{ kare: "durum/onay_bekleme", ms: 500 }],
  "hata": [{ kare: "durum/hata", ms: 500 }, { kare: "tepki_hata", ms: Infinity }],
  "mutlu": [{ kare: "durum/gulumseme", ms: 500 }],
  "basari": [{ kare: "durum/basari", ms: 500 }],
  "uyku": [{ kare: "durum/uyku_masa", ms: 500 }, { kare: "tepki_uyku", ms: Infinity }],
  "yuzme": [{ kare: "uyan_yuzme", ms: 500 }],
  "etkilesim": [{ kare: "durum/inis", ms: 500 }],
  "surukleme": [{ kare: "durum/ense_tutma", ms: Infinity }],
  "geri_donus": [{ kare: "akis_suzulme", ms: Infinity }],
  "yaslanma": [{ kare: "akis_tutunma", ms: 120 }, { kare: "akis_bekleme", ms: 600 }],
};
// STÜDYO AYAR BAŞLANGIÇ
export const PET_AYAR: Record<PetPose, { olcek: number; x: number; y: number }> = {
  "donus": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "bekleme": {
    "olcek": 100,
    "x": 0,
    "y": 2
  },
  "gecis": {
    "olcek": 100,
    "x": 58,
    "y": 8
  },
  "uyanma": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "dusunme": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "uyari": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "hata": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "mutlu": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "basari": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "uyku": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "yuzme": {
    "olcek": 100,
    "x": 0,
    "y": 10
  },
  "etkilesim": {
    "olcek": 100,
    "x": 0,
    "y": 10
  },
  "surukleme": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "geri_donus": {
    "olcek": 100,
    "x": 0,
    "y": 0
  },
  "yaslanma": {
    "olcek": 100,
    "x": 0,
    "y": 0
  }
};
function studyoKareYolu(kare: string) { return kare.startsWith("durum/") ? `/afu/durum/${kare.slice(6)}.webp` : `/afu/pet/${kare}.webp`; }
export const PET_NORMALIZE: string[] = ["donus", "uyku", "bekleme", "gecis", "uyanma", "dusunme", "uyari", "hata", "mutlu", "basari", "yuzme", "etkilesim", "surukleme"];
export const PET_BOYUT: Record<string, { olcek: number; x: number; y: number; kutu: [number, number, number, number] }> = {
  "akis_bekleme": {
    "olcek": 0.9437229437229437,
    "x": 0.015515754393897518,
    "y": 0.001825382869870338,
    "kutu": [
      0.2147001934235977,
      0.5512572533849129,
      0.7524177949709865,
      0.9980657640232108
    ]
  },
  "akis_gorunme": {
    "olcek": 1.3624999999999998,
    "x": 0.0013176982591876496,
    "y": 0.0026353965183753,
    "kutu": [
      0.21470019342359764,
      0.6885880077369438,
      0.7833655705996132,
      0.9980657640232108
    ]
  },
  "akis_kuculme": {
    "olcek": 0.7676056338028168,
    "x": 0.0,
    "y": 0.001484730432887493,
    "kutu": [
      0.22050290135396516,
      0.44874274661508695,
      0.7794970986460348,
      0.9980657640232108
    ]
  },
  "akis_normal": {
    "olcek": 0.4932126696832579,
    "x": 0.00047699484495478117,
    "y": 0.000953989689909611,
    "kutu": [
      0.17794970986460346,
      0.14313346228239843,
      0.8201160541586073,
      0.9980657640232108
    ]
  },
  "akis_suzulme": {
    "olcek": 0.55470737913486,
    "x": 0.0,
    "y": 0.0010729349693130994,
    "kutu": [
      0.14506769825918764,
      0.23791102514506768,
      0.8549323017408124,
      0.9980657640232108
    ]
  },
  "akis_tutunma": {
    "olcek": 0.7985347985347985,
    "x": 0.0007722773680220452,
    "y": 0.0015445547360441322,
    "kutu": [
      0.18375241779497098,
      0.47001934235976783,
      0.8143133462282398,
      0.9980657640232108
    ]
  },
  "durum_bakis": {
    "olcek": 2.0960357551970854,
    "x": 0.08597021652175546,
    "y": 0.004093819834369307,
    "kutu": [
      0.318359375,
      0.796875,
      0.599609375,
      0.998046875
    ]
  },
  "durum_dusunme": {
    "olcek": 1.9989970628268499,
    "x": 0.07027724049000644,
    "y": 0.003904291138333691,
    "kutu": [
      0.32421875,
      0.787109375,
      0.60546875,
      0.998046875
    ]
  },
  "durum_etkilesim": {
    "olcek": 1.9626516616845435,
    "x": 0.08433268858800774,
    "y": 0.003833304026727624,
    "kutu": [
      0.328125,
      0.783203125,
      0.5859375,
      0.998046875
    ]
  },
  "durum_goz_kirpma": {
    "olcek": 1.8773189807417374,
    "x": 0.07699941131948529,
    "y": 0.003666638634261206,
    "kutu": [
      0.306640625,
      0.7734375,
      0.611328125,
      0.998046875
    ]
  },
  "durum_idle": {
    "olcek": 1.9989970628268499,
    "x": 0.08784655061250807,
    "y": 0.007808582276667382,
    "kutu": [
      0.310546875,
      0.78515625,
      0.6015625,
      0.99609375
    ]
  },
  "durum_mutlu": {
    "olcek": 1.8773189807417374,
    "x": 0.027499789756959048,
    "y": 0.003666638634261206,
    "kutu": [
      0.318359375,
      0.7734375,
      0.65234375,
      0.998046875
    ]
  },
  "durum_saskin": {
    "olcek": 1.980657640232108,
    "x": 0.03868471953578334,
    "y": 0.003868471953578336,
    "kutu": [
      0.318359375,
      0.78515625,
      0.642578125,
      0.998046875
    ]
  },
  "durum_uyku": {
    "olcek": 2.225687451394843,
    "x": 0.08694091607011106,
    "y": 0.004347045803505553,
    "kutu": [
      0.3046875,
      0.80859375,
      0.6171875,
      0.998046875
    ]
  },
  "gecis_kayma": {
    "olcek": 0.55470737913486,
    "x": 0.0,
    "y": 0.0010729349693130994,
    "kutu": [
      0.14506769825918764,
      0.23791102514506768,
      0.8549323017408124,
      0.9980657640232108
    ]
  },
  "gecis_kompakt": {
    "olcek": 0.7676056338028168,
    "x": 0.0,
    "y": 0.001484730432887493,
    "kutu": [
      0.22050290135396516,
      0.44874274661508695,
      0.7794970986460348,
      0.9980657640232108
    ]
  },
  "idle_goz_acilis": {
    "olcek": 1.0,
    "x": 0.0,
    "y": 0.0019342359767892114,
    "kutu": [
      0.2514506769825919,
      0.5764023210831721,
      0.7485493230174081,
      0.9980657640232108
    ]
  },
  "idle_goz_kapali": {
    "olcek": 1.0139534883720929,
    "x": 0.0009806126580000907,
    "y": 0.0019612253160002234,
    "kutu": [
      0.2495164410058027,
      0.5822050290135397,
      0.7485493230174081,
      0.9980657640232108
    ]
  },
  "idle_nefes": {
    "olcek": 0.9083333333333333,
    "x": 0.0008784655061250812,
    "y": 0.0017569310122502004,
    "kutu": [
      0.25338491295938104,
      0.5338491295938104,
      0.7446808510638298,
      0.9980657640232108
    ]
  },
  "idle_normal": {
    "olcek": 1.0,
    "x": 0.0,
    "y": 0.0019342359767892114,
    "kutu": [
      0.2514506769825919,
      0.5764023210831721,
      0.7485493230174081,
      0.9980657640232108
    ]
  },
  "idle_sag": {
    "olcek": 0.9688888888888888,
    "x": 0.015929507844401447,
    "y": 0.0018740597464002135,
    "kutu": [
      0.23017408123791105,
      0.562862669245648,
      0.7369439071566731,
      0.9980657640232108
    ]
  },
  "idle_sol": {
    "olcek": 0.9909090909090909,
    "x": -0.0009583260066818866,
    "y": 0.0019166520133638548,
    "kutu": [
      0.25338491295938104,
      0.5725338491295937,
      0.7485493230174081,
      0.9980657640232108
    ]
  },
  "ozel_bas_donmesi": {
    "olcek": 0.525301204819277,
    "x": 0.005080282445060702,
    "y": 0.0010160564890121639,
    "kutu": [
      0.08510638297872342,
      0.19535783365570591,
      0.8955512572533849,
      0.9980657640232108
    ]
  },
  "ozel_dosya_tut": {
    "olcek": 0.5751978891820579,
    "x": 0.01001311605926214,
    "y": 0.0011125684510291504,
    "kutu": [
      0.06382978723404253,
      0.264990328820116,
      0.9013539651837524,
      0.9980657640232108
    ]
  },
  "ozel_dosya_yakala": {
    "olcek": 0.4823008849557522,
    "x": 0.0009328837233186782,
    "y": 0.0009328837233186904,
    "kutu": [
      0.044487427466150864,
      0.12379110251450676,
      0.9516441005802708,
      0.9980657640232108
    ]
  },
  "ozel_sessiz": {
    "olcek": 0.5721784776902886,
    "x": -0.009407189671890581,
    "y": 0.0011067281966930394,
    "kutu": [
      0.08897485493230173,
      0.26112185686653766,
      0.9439071566731141,
      0.9980657640232108
    ]
  },
  "ozel_veda": {
    "olcek": 0.6123595505617977,
    "x": -0.006514463303848861,
    "y": 0.0011844478734271012,
    "kutu": [
      0.08704061895551252,
      0.30947775628626684,
      0.9342359767891683,
      0.9980657640232108
    ]
  },
  "ozel_yogun": {
    "olcek": 0.557544757033248,
    "x": 0.008627385021791056,
    "y": 0.001078423127723908,
    "kutu": [
      0.03288201160541587,
      0.241779497098646,
      0.9361702127659575,
      0.9980657640232108
    ]
  },
  "simge": {
    "olcek": 0.6622444257217786,
    "x": 0.04915095347153825,
    "y": 0.0012934461439878487,
    "kutu": [
      0.06640625,
      0.361328125,
      0.78515625,
      0.998046875
    ]
  },
  "tepki_basari": {
    "olcek": 0.9437229437229437,
    "x": 0.0009126914349351645,
    "y": 0.001825382869870338,
    "kutu": [
      0.2263056092843327,
      0.5512572533849129,
      0.7717601547388782,
      0.9980657640232108
    ]
  },
  "tepki_dinleme": {
    "olcek": 0.889795918367347,
    "x": 0.007744838747878291,
    "y": 0.0017210752773063188,
    "kutu": [
      0.23597678916827852,
      0.5241779497098646,
      0.746615087040619,
      0.9980657640232108
    ]
  },
  "tepki_dusunme": {
    "olcek": 0.8825910931174088,
    "x": 0.018778533896115057,
    "y": 0.0017071394451014092,
    "kutu": [
      0.2030947775628627,
      0.5203094777562862,
      0.7543520309477756,
      0.9980657640232108
    ]
  },
  "tepki_goz_kirpma": {
    "olcek": 0.8861788617886178,
    "x": 0.0,
    "y": 0.0017140790363416587,
    "kutu": [
      0.2263056092843327,
      0.5222437137330753,
      0.7736943907156673,
      0.9980657640232108
    ]
  },
  "tepki_hata": {
    "olcek": 0.9954337899543378,
    "x": 0.01925403849041274,
    "y": 0.0019254038490413153,
    "kutu": [
      0.22050290135396522,
      0.5744680851063829,
      0.7408123791102514,
      0.9980657640232108
    ]
  },
  "tepki_konusma": {
    "olcek": 0.904564315352697,
    "x": 0.0026244612631122766,
    "y": 0.0017496408420748881,
    "kutu": [
      0.22243713733075432,
      0.5319148936170213,
      0.7717601547388782,
      0.9980657640232108
    ]
  },
  "tepki_mutlu": {
    "olcek": 0.9437229437229437,
    "x": 0.0009126914349351645,
    "y": 0.001825382869870338,
    "kutu": [
      0.22243713733075432,
      0.5512572533849129,
      0.7756286266924565,
      0.9980657640232108
    ]
  },
  "tepki_uyari": {
    "olcek": 0.9121338912133891,
    "x": 0.019407104068369985,
    "y": 0.001764282188033674,
    "kutu": [
      0.21083172147001938,
      0.5357833655705996,
      0.746615087040619,
      0.9980657640232108
    ]
  },
  "tepki_uyku": {
    "olcek": 0.9732142857142856,
    "x": 0.004706065211384336,
    "y": 0.0018824260845537858,
    "kutu": [
      0.218568665377176,
      0.5647969052224371,
      0.7717601547388782,
      0.9980657640232108
    ]
  },
  "uyan_dikkat": {
    "olcek": 0.8449612403100775,
    "x": 0.0008171772150000756,
    "y": 0.0016343544300001863,
    "kutu": [
      0.2050290135396518,
      0.4990328820116054,
      0.7930367504835589,
      0.9980657640232108
    ]
  },
  "uyan_gizli": {
    "olcek": 1.73015873015873,
    "x": 0.001673267630714459,
    "y": 0.003346535261428953,
    "kutu": [
      0.20696324951644096,
      0.7543520309477756,
      0.7911025145067698,
      0.9980657640232108
    ]
  },
  "uyan_gozukme": {
    "olcek": 1.1295336787564767,
    "x": 0.0010923923392229251,
    "y": 0.002184784678445845,
    "kutu": [
      0.2050290135396518,
      0.6247582205029013,
      0.7930367504835589,
      0.9980657640232108
    ]
  },
  "uyan_tam": {
    "olcek": 0.7985347985347985,
    "x": 0.0007722773680220452,
    "y": 0.0015445547360441322,
    "kutu": [
      0.18375241779497098,
      0.47001934235976783,
      0.8143133462282398,
      0.9980657640232108
    ]
  },
  "uyan_yukselme": {
    "olcek": 0.8449612403100775,
    "x": 0.0008171772150000756,
    "y": 0.0016343544300001863,
    "kutu": [
      0.2050290135396518,
      0.4990328820116054,
      0.7930367504835589,
      0.9980657640232108
    ]
  },
  "uyan_yuzme": {
    "olcek": 0.8790322580645161,
    "x": 0.0,
    "y": 0.015302302364759516,
    "kutu": [
      0.230174081237911,
      0.5029013539651837,
      0.7698259187620891,
      0.9825918762088974
    ]
  },
  "durum/basari": {
    "olcek": 0.7484526112185685,
    "x": 0.0,
    "y": 0.0,
    "kutu": [
      0.0,
      0.43661971830985913,
      1.0,
      1.0
    ]
  },
  "durum/bekleme": {
    "olcek": 0.44560066895846884,
    "x": -0.005523975235022349,
    "y": 0.0,
    "kutu": [
      0.07024793388429745,
      0.05371900826446285,
      0.9545454545454546,
      1.0
    ]
  },
  "durum/bosta_nefes": {
    "olcek": 0.44148522871927126,
    "x": 0.0,
    "y": 0.0,
    "kutu": [
      0.0326530612244898,
      0.04489795918367345,
      0.9673469387755103,
      1.0
    ]
  },
  "durum/calisma_yazma": {
    "olcek": 0.4270009548759885,
    "x": -0.0008895853226582595,
    "y": 0.0,
    "kutu": [
      0.12916666666666665,
      0.012499999999999956,
      0.875,
      1.0
    ]
  },
  "durum/dinleme": {
    "olcek": 0.43433144337171364,
    "x": -0.0009048571736910427,
    "y": 0.0,
    "kutu": [
      0.04375000000000001,
      0.029166666666666674,
      0.9604166666666667,
      1.0
    ]
  },
  "durum/dosya_yakalama": {
    "olcek": 0.6173722139248667,
    "x": -0.0026687559679748896,
    "y": 0.0,
    "kutu": [
      0.00864553314121036,
      0.3170028818443804,
      1.0,
      1.0
    ]
  },
  "durum/dusunme": {
    "olcek": 0.4539610683567225,
    "x": -0.0035886250462981995,
    "y": 0.0,
    "kutu": [
      0.03162055335968372,
      0.07114624505928857,
      0.9841897233201581,
      1.0
    ]
  },
  "durum/dusunme_masa": {
    "olcek": 0.49554464448081464,
    "x": -0.0009009902626924138,
    "y": 0.0,
    "kutu": [
      0.02909090909090911,
      0.14909090909090905,
      0.9745454545454546,
      1.0
    ]
  },
  "durum/ense_tutma": {
    "olcek": 0.42166344294003866,
    "x": -0.006039450354609954,
    "y": 0.0,
    "kutu": [
      0.028645833333333315,
      0.0,
      1.0,
      1.0
    ]
  },
  "durum/gulumseme": {
    "olcek": 0.4417426545086119,
    "x": -0.004563457174675767,
    "y": 0.0,
    "kutu": [
      0.06198347107438018,
      0.045454545454545414,
      0.9586776859504132,
      1.0
    ]
  },
  "durum/hata": {
    "olcek": 0.4270009548759885,
    "x": 0.0,
    "y": 0.0,
    "kutu": [
      0.06874999999999998,
      0.012499999999999956,
      0.93125,
      1.0
    ]
  },
  "durum/inis": {
    "olcek": 0.42166344294003866,
    "x": 0.0,
    "y": 0.0,
    "kutu": [
      0.15000000000000002,
      0.0,
      0.85,
      1.0
    ]
  },
  "durum/inis_oturma": {
    "olcek": 0.43247532609234735,
    "x": -0.0018019805253848276,
    "y": 0.010811883152308693,
    "kutu": [
      0.17916666666666664,
      0.0,
      0.8291666666666666,
      0.975
    ]
  },
  "durum/kalkis": {
    "olcek": 0.8019135120198949,
    "x": -0.09035645205857967,
    "y": 0.01505940867642999,
    "kutu": [
      0.22769953051643188,
      0.45539906103286376,
      0.9976525821596244,
      0.9812206572769953
    ]
  },
  "durum/kitap_buyu": {
    "olcek": 0.6577949709864602,
    "x": 0.0955770470664088,
    "y": 0.011244358478401063,
    "kutu": [
      0.0911680911680911,
      0.3418803418803418,
      0.6182336182336182,
      0.9829059829059829
    ]
  },
  "durum/kitap_selam": {
    "olcek": 0.5013897241681973,
    "x": 0.0017716951384035284,
    "y": 0.003543390276807073,
    "kutu": [
      0.0,
      0.15194346289752647,
      0.9929328621908127,
      0.9929328621908127
    ]
  },
  "durum/konusma": {
    "olcek": 0.4234203739522888,
    "x": -0.002635396518375188,
    "y": 0.0,
    "kutu": [
      0.012448132780082943,
      0.004149377593360981,
      1.0,
      1.0
    ]
  },
  "durum/kota_doldu": {
    "olcek": 0.4458115696282347,
    "x": 0.0,
    "y": 0.011145289240705878,
    "kutu": [
      0.19583333333333336,
      0.029166666666666674,
      0.8041666666666667,
      0.975
    ]
  },
  "durum/masa_cikis": {
    "olcek": 0.4515157220862361,
    "x": -0.0027986511699560346,
    "y": 0.0,
    "kutu": [
      0.041322314049586806,
      0.06611570247933884,
      0.9710743801652892,
      1.0
    ]
  },
  "durum/onay_bekleme": {
    "olcek": 0.4270009548759885,
    "x": 0.0,
    "y": 0.0,
    "kutu": [
      0.01874999999999999,
      0.012499999999999956,
      0.98125,
      1.0
    ]
  },
  "durum/sasirma": {
    "olcek": 0.4417426545086119,
    "x": -0.003650765739740547,
    "y": 0.0,
    "kutu": [
      0.061983471074380125,
      0.045454545454545414,
      0.9545454545454546,
      1.0
    ]
  },
  "durum/selam_masa": {
    "olcek": 0.5670646301607416,
    "x": 0.002726272260388185,
    "y": 0.0,
    "kutu": [
      0.028846153846153855,
      0.2564102564102564,
      0.9615384615384616,
      1.0
    ]
  },
  "durum/ucus": {
    "olcek": 0.44755505785740946,
    "x": 0.0,
    "y": 0.009247005327632446,
    "kutu": [
      0.02479338842975204,
      0.037190082644628086,
      0.975206611570248,
      0.9793388429752066
    ]
  },
  "durum/uyanma": {
    "olcek": 0.6031388487623338,
    "x": 0.0,
    "y": 0.0,
    "kutu": [
      0.008849557522123908,
      0.3008849557522124,
      0.9911504424778761,
      1.0
    ]
  },
  "durum/uyku_masa": {
    "olcek": 0.5338657324777314,
    "x": 0.004524285868455324,
    "y": 0.0,
    "kutu": [
      0.02372881355932205,
      0.21016949152542375,
      0.9593220338983051,
      1.0
    ]
  },
  "durum/veda": {
    "olcek": 0.43063500555578416,
    "x": -0.002691468784723594,
    "y": 0.0,
    "kutu": [
      0.08124999999999999,
      0.02083333333333337,
      0.9312499999999999,
      1.0
    ]
  },
  "durum/veda_yakin": {
    "olcek": 0.43247532609234735,
    "x": 0.0036039610507695996,
    "y": 0.0,
    "kutu": [
      0.06666666666666665,
      0.025000000000000022,
      0.9166666666666666,
      1.0
    ]
  },
  "durum/yatay_suzulme": {
    "olcek": 0.47506187021192126,
    "x": 0.001841325078340783,
    "y": 0.007365300313363133,
    "kutu": [
      0.01937984496124029,
      0.0968992248062015,
      0.9728682170542635,
      0.9844961240310077
    ]
  }
};
// STÜDYO OYNATMA BAŞLANGIÇ
// Animasyon başına hız (0,25–2) ve döngü arası bekleme (ms). Bekleme pozunda
// göz kırpma 2 kat yavaşlar ve döngüler arası 3,5 sn bekler (rastgele ±%30).
export const PET_OYNATMA: Record<PetPose, { hiz: number; donguArasi: number }> = {
  "donus": { "hiz": 1, "donguArasi": 0 },
  "bekleme": { "hiz": 0.5, "donguArasi": 3500 },
  "gecis": { "hiz": 1, "donguArasi": 0 },
  "uyanma": { "hiz": 1, "donguArasi": 0 },
  "dusunme": { "hiz": 1, "donguArasi": 0 },
  "uyari": { "hiz": 1, "donguArasi": 0 },
  "hata": { "hiz": 1, "donguArasi": 0 },
  "mutlu": { "hiz": 1, "donguArasi": 0 },
  "basari": { "hiz": 1, "donguArasi": 0 },
  "uyku": { "hiz": 1, "donguArasi": 0 },
  "yuzme": { "hiz": 1, "donguArasi": 0 },
  "etkilesim": { "hiz": 1, "donguArasi": 0 },
  "surukleme": { "hiz": 1, "donguArasi": 0 },
  "geri_donus": { "hiz": 1, "donguArasi": 0 },
  "yaslanma": { "hiz": 1, "donguArasi": 0 }
};
// STÜDYO OYNATMA SON
export const PET_TUTMA = { guc: 50 };
// STÜDYO AYAR SON

/**
 * Fareyle taşırken tutma noktası: karenin içinde (0–1 kesir) elin üst ucu.
 * Bu nokta imlecin altına gelir ve sarkaç bu nokta etrafında sallanır.
 * Listede olmayan karelerde eski ense noktası (yatay orta, 90 px) kullanılır.
 */
export const PET_TUTMA_NOKTASI: Record<string, { x: number; y: number }> = {
  "durum/ense_tutma": { x: 220 / 384, y: 0 },
};
/** Karenin tutma noktası (pet penceresi pikseli). */
export function tutmaNoktasi(kare: string, pencere = PET_PENCERE): { x: number; y: number } {
  const nokta = PET_TUTMA_NOKTASI[kare];
  return nokta ? { x: nokta.x * pencere, y: nokta.y * pencere } : { x: pencere / 2, y: 90 };
}

// P4: enseden tutma sarkacı. Hesap tamamen saf: durum (adım=hız açısı, hız=açısal hız)
// dışarıdan verilir, yeni durum döner. Test edilebilir olsun diye sınıftan bağımsız.
/** En fazla eğilme açısı (derece). */
export const SARKAC_MAX_ACI = 25;
/** Bu yatay hızda (px/sn) tam açı verilir; üstü sınırlanır. */
export const SARKAC_HIZ_TAM = 1200;
/** Tutulurken: yay gücü ve sönüm (60 fps adımı başına). */
export const SARKAC_YAY = 0.3;
export const SARKAC_SONUM = 0.7;
/** Bırakılınca dik konuma dönüş: daha yumuşak yay, daha güçlü sönüm. */
export const SARKAC_DONUS_YAY = 0.1;
export const SARKAC_DONUS_SONUM = 0.85;
/** Hızlı sallamada en fazla uzama (scaleY). */
export const SARKAC_UZAMA_MAX = 1.06;
/** Nefes/bacak sallanması: 0,6 sn periyot, pik genlik (px). */
export const SARKAC_NEFES_MS = 600;
export const SARKAC_NEFES_PIK = 2;
const SARKAC_KARE_SN = 1 / 60;
export type SarkacDurum = { adim: number; hiz: number };
function sarkacSinirla(deger: number) {
  if (!Number.isFinite(deger)) return 0;
  const sinirli = Math.max(-SARKAC_MAX_ACI, Math.min(SARKAC_MAX_ACI, deger));
  return sinirli === 0 ? 0 : sinirli;
}
/** Yatay fare hızı (px/sn) → eğilme açısı. Fare sağa gidince kedi sola eğilir. */
export function sarkacHedef(hiz: number) {
  if (Number.isNaN(hiz)) return 0;
  if (!Number.isFinite(hiz)) return hiz > 0 ? -SARKAC_MAX_ACI : SARKAC_MAX_ACI;
  return sarkacSinirla(-(hiz / SARKAC_HIZ_TAM) * SARKAC_MAX_ACI);
}
/** Açısal hız (derece/kare) → scaleY. 1 ile 1,06 arasında kalır. */
export function sarkacUzama(hiz: number) {
  if (!Number.isFinite(hiz)) return 1;
  return Math.max(1, Math.min(SARKAC_UZAMA_MAX, 1 + Math.abs(hiz) * 0.01));
}
/** Geçen süre (ms) → nefes (dikey px) ve bacak (yatay px) sallanması. */
export function sarkacNefes(t: number) {
  if (!Number.isFinite(t)) return { nefes: 0, bacak: 0 };
  const dalga = Math.sin((t / SARKAC_NEFES_MS) * Math.PI * 2);
  return { nefes: dalga * SARKAC_NEFES_PIK, bacak: dalga * SARKAC_NEFES_PIK * 0.35 };
}
/**
 * Sönümlü yay adımı. dt saniye cinsindendir ve 60 fps'e normalize edilir.
 * hedef verilmezse sarkaç 0'a (dik konuma) döner. sert=true tutulurken kullanılır.
 */
export function sarkac(adim: number, hiz: number, dt: number, hedef = 0, sert = false): SarkacDurum {
  if (!Number.isFinite(adim) || !Number.isFinite(hiz) || !Number.isFinite(dt)) return { adim: 0, hiz: 0 };
  if (dt <= 0) return { adim: sarkacSinirla(adim), hiz: 0 };
  const yay = sert ? SARKAC_YAY : SARKAC_DONUS_YAY;
  const sonum = sert ? SARKAC_SONUM : SARKAC_DONUS_SONUM;
  const kare = Math.min(8, dt / SARKAC_KARE_SN);
  const hedefAci = sarkacSinirla(hedef);
  let yeniHiz = (hiz + (hedefAci - adim) * yay * kare) * Math.pow(sonum, kare);
  let yeniAdim = adim + yeniHiz;
  if (yeniAdim > SARKAC_MAX_ACI) { yeniAdim = SARKAC_MAX_ACI; yeniHiz = Math.min(yeniHiz, 0); }
  else if (yeniAdim < -SARKAC_MAX_ACI) { yeniAdim = -SARKAC_MAX_ACI; yeniHiz = Math.max(yeniHiz, 0); }
  if (!Number.isFinite(yeniAdim) || !Number.isFinite(yeniHiz)) return { adim: 0, hiz: 0 };
  return { adim: yeniAdim, hiz: yeniHiz };
}

/**
 * Premium görünüm: petin ışık/kenar rengi (`data-durum`). Petin kendi tepkisi
 * (hata, başarı, soru, uyku) önce gelir; sakin pozlarda görevin durumu gösterilir.
 */
export function petDurum(pose: PetPose, gorevDurum: string): string {
  if (pose === "hata" || pose === "uyari") return "hata";
  if (pose === "basari" || pose === "mutlu") return "basari";
  if (pose === "dusunme") return "onay-bekliyor";
  if (pose === "uyku") return "uyku";
  return gorevDurum;
}

export class PetModel {
  pose: PetPose = "bekleme";
  balloon: "!" | "?" | null = null;
  private now: number;
  private poseAt: number;
  private lastActivity: number;
  private hoverPose: PetPose | null = null;
  constructor(now = Date.now()) { this.now = this.poseAt = this.lastActivity = now; }
  setPose(pose: PetPose) { this.pose = pose; this.poseAt = this.now; }
  land() { this.lastActivity = this.now; this.setPose("yaslanma"); }
  acknowledge() { this.balloon = null; this.lastActivity = this.now; this.setPose("bekleme"); }
  get frame() {
    const sequence = SEKANSLAR[this.pose];
    const duration = sequence.reduce((sum, frame) => sum + frame.ms, 0);
    let elapsed = Math.max(0, this.now - this.poseAt);
    if (this.pose === "bekleme") elapsed %= duration;
    for (const frame of sequence) { if (elapsed < frame.ms) return frame.kare; elapsed -= frame.ms; }
    return sequence[sequence.length - 1].kare;
  }
  onEvent(event: AfuEvent) {
    this.lastActivity = this.now;
    if (["surukleme", "geri_donus", "yaslanma"].includes(this.pose)) {
      if (event.kind === "RATE_LIMIT" || event.kind === "JOB_FAILED") this.balloon = "!";
      else if (event.kind === "WAITING") this.balloon = "?";
      return;
    }
    if (event.kind === "RATE_LIMIT" || event.kind === "JOB_FAILED") { this.balloon = "!"; this.setPose(event.kind === "JOB_FAILED" ? "hata" : "uyari"); return; }
    if (this.pose === "uyari" || this.pose === "hata") return;
    if (this.pose === "uyku") { this.setPose("uyanma"); return; }
    if (event.kind === "JOB_FINISHED") { this.balloon = null; this.setPose("basari"); }
    else if (event.kind === "WAITING") { this.balloon = "?"; this.setPose("dusunme"); }
    else { if (this.pose !== "yaslanma") this.balloon = null; this.setPose("bekleme"); }
  }
  hover(on: boolean) {
    this.lastActivity = this.now;
    if (["uyari", "hata", "surukleme", "geri_donus", "yaslanma"].includes(this.pose)) return;
    if (on) { this.hoverPose = this.pose === "uyku" ? "uyanma" : "bekleme"; this.setPose(this.pose === "uyku" ? "uyanma" : "yuzme"); }
    else { this.setPose(this.hoverPose ?? "bekleme"); this.hoverPose = null; }
  }
  tick(now: number) {
    this.now = Math.max(this.now, now);
    if (this.pose === "bekleme" && this.now - this.lastActivity > 600000) { this.setPose("uyku"); return; }
    if (!["bekleme", "uyari", "hata", "uyku", "yuzme", "surukleme", "geri_donus"].includes(this.pose)) {
      const duration = SEKANSLAR[this.pose].reduce((sum, frame) => sum + frame.ms, 0);
      if (this.now - this.poseAt >= duration) { if (this.pose !== "yaslanma") this.balloon = null; this.setPose("bekleme"); }
    }
  }
  shift(ms: number) { this.now += ms; this.poseAt += ms; this.lastActivity += ms; }
}
/** W7: ifade animasyonu normal hızda bir kez oynar, son karede durur. */
const IFADE_OYNATMA = { hiz: 1, donguArasi: 60000 };
export class AfuPet {
  readonly image = h("img", { class: "pet-image pet-gizli", src: "/afu/pet/idle_normal.webp", alt: "Afu", draggable: false });
  readonly previous = h("img", { class: "pet-image pet-previous pet-gizli", src: "/afu/pet/idle_normal.webp", alt: "", draggable: false });
  // P7: animasyonlu webp kare kare buraya çizilir (hız/bekleme ayarı). Çözülemezse gizli kalır.
  readonly canvas = h("canvas", { class: "pet-image pet-canvas", width: TUVAL_BOYUTU, height: TUVAL_BOYUTU, "aria-hidden": "true" });
  readonly balloon = h("span", { class: "pet-balloon", "aria-hidden": "true" });
  readonly el: HTMLButtonElement;
  readonly model = new PetModel();
  private timer: number | null = null;
  private active = false;
  private pausedAt: number | null = null;
  private dragStart = 0;
  private clickX = 0;
  private clickY = 0;
  private swingAngle = 0;
  private swingVel = 0;
  private fareHiz = 0;
  private lastPhysicsAt = 0;
  private dragRaf: number | null = null;
  private lastWinX = 0;
  private frame = "idle_normal";
  private dragPending: Promise<boolean> | null = null;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private readonly oynatici: WebpOynatici;
  // W7: boştayken arada kısa ifade. Meşgul bilgisi (iş, soru, balon) adadan gelir.
  readonly ifade = new IfadeZamanlayici();
  private ifadeAcik = loadPetIfade();
  private mesgul: (() => boolean) | null = null;
  readonly appsMenu = h("div", { class: "pet-apps-menu", hidden: true, role: "dialog", "aria-label": "Afu uygulamaları" });
  private appsSnapshot: AppsSnapshot = { apps: [], durumlar: {} };
  private appOpener: ((id: string) => Promise<string | null | void>) | null = null;
  private gorevDurum = "bosta";
  constructor(open: () => void, private appsRequested?: () => void, private appsVisible?: (on: boolean) => void) {
    this.el = h("button", { id: "afu-pet", hidden: true, "aria-label": "Afu kartını aç", onclick: () => {
      const activate = () => { this.hideApps(); this.model.acknowledge(); open(); };
      const pending = this.dragPending;
      if (pending) void pending.then(dragged => { if (!dragged && this.active) activate(); });
      else activate();
    } }, this.previous, this.image, this.canvas, this.balloon);
    document.body.append(this.appsMenu);
    this.el.addEventListener("pointerdown", event => {
      if (event.button !== 0 || !this.active || this.dragPending) return;
      this.hideApps();
      if (event.isTrusted) this.el.setPointerCapture(event.pointerId);
      this.clickX = event.clientX;
      this.clickY = event.clientY;
      this.lastWinX = window.screenX;

      let moved = false;
      const startX = event.clientX;
      const startY = event.clientY;

      const startDrag = () => {
        const pending = Bridge.petDrag().catch(() => {
          this.el.title = "Afu taşınamadı. Yeniden dene.";
          return true;
        });
        this.dragPending = pending;
        void pending.then(() => {
          window.setTimeout(() => { if (this.dragPending === pending) this.dragPending = null; }, 100);
        });
      };

      const onMove = (moveEvent: PointerEvent) => {
        if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 5) {
          moved = true;
          this.el.releasePointerCapture(event.pointerId);
          window.removeEventListener("pointermove", onMove);
          startDrag();
        }
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
    void onEvent<"held" | "returning" | "landed">("pet-drag", phase => {
      if (!this.active) return;
      this.model.tick(Date.now());
      if (phase === "landed") {
        this.model.land();
      } else {
        this.model.setPose(phase === "held" ? "surukleme" : "geri_donus");
        if (phase === "held" && !this.dragRaf && !this.reduced.matches) {
          this.dragStart = performance.now();
          this.lastPhysicsAt = this.dragStart;
          this.lastWinX = window.screenX;
          this.fareHiz = 0;
          this.dragRaf = requestAnimationFrame(() => this.runPhysics());
        }
      }
      this.paint();
    });
    this.el.addEventListener("contextmenu", event => { event.preventDefault(); this.appsRequested?.(); this.showApps(); });
    document.addEventListener("pointerdown", event => { if (!this.appsMenu.contains(event.target as Node) && !this.el.contains(event.target as Node)) this.hideApps(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") { this.hideApps(); this.el.focus(); } });
    for (const frame of new Set(Object.values(SEKANSLAR).flat().map(item => item.kare))) { const image = new Image(); image.src = studyoKareYolu(frame); }
    this.el.addEventListener("mouseenter", () => { if (this.dragPending) return; this.model.tick(Date.now()); this.model.hover(true); this.paint(); });
    this.el.addEventListener("mouseleave", () => { if (this.dragPending) return; this.model.tick(Date.now()); this.model.hover(false); this.paint(); });
    document.addEventListener("visibilitychange", () => this.setVisible(this.active && !document.hidden));
    this.reduced.addEventListener("change", () => { this.stopTimer(); this.sallanmaDurdur(); if (this.active) this.run(); });
    // W7: "Arada ifade yap" ayarı değişince hemen uygulanır.
    const ifadeAyari = () => { this.ifadeAcik = loadPetIfade(); };
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener(PET_IFADE_OLAYI, ifadeAyari);
      window.addEventListener("storage", ifadeAyari);
    }
    // P7: çözücü kurulamazsa oynatıcı açılmaz, <img> aynen oynar.
    this.oynatici = new WebpOynatici({ cizici: tuvalCizici(this.canvas), durum: oynuyor => this.el.classList.toggle("pet-oynuyor", oynuyor) });
  }
  /** W7: iş çalışırken / soru ya da balon açıkken true döndüren kontrol. */
  setMesgul(kontrol: () => boolean) { this.mesgul = kontrol; }
  /** W7: Afu gerçekten boşta mı? Değilse ifade yapılmaz. */
  private ifadeBosta() {
    return this.active && this.pausedAt === null && !document.hidden && !this.reduced.matches
      && this.model.pose === "bekleme" && this.model.balloon === null
      && !this.dragPending && this.dragRaf === null && this.appsMenu.hidden
      && !(this.mesgul?.() ?? false);
  }
  setAppOpener(open: (id: string) => Promise<string | null | void>) { this.appOpener = open; this.renderApps(); }
  setApps(snapshot: AppsSnapshot) { this.appsSnapshot = snapshot; this.renderApps(); this.positionApps(); }
  hideApps() { const visible = !this.appsMenu.hidden; this.appsMenu.hidden = true; if (visible) this.appsVisible?.(false); }
  private showApps() {
    this.renderApps();
    this.appsMenu.hidden = false; this.appsVisible?.(true);
    this.positionApps();
    this.appsMenu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }
  positionApps() {
    if (this.appsMenu.hidden) return;
    const rect = this.el.getBoundingClientRect();
    this.appsMenu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 284))}px`;
    this.appsMenu.style.top = `${Math.max(8, Math.min(rect.top - this.appsMenu.offsetHeight - 8, innerHeight - this.appsMenu.offsetHeight - 8))}px`;
  }
  private renderApps() {
    this.appsMenu.replaceChildren(h("strong", { text: "Afu uygulamaları" }));
    const rows = appRows(this.appsSnapshot.apps, this.appsSnapshot.durumlar);
    if (!rows.length) this.appsMenu.append(h("p", { text: "Uygulamalar bekleniyor." }));
    for (const row of rows) {
      const button = h("button", { class: `pet-app-row${row.acilabilir || row.indirilebilir ? "" : " unavailable"}`, onclick: () => { 
        if (row.indirilebilir && row.indirUrl) {
          void Bridge.appDownload(row.id);
        } else {
          void this.openApp(row.id); 
        }
      } },
        h("i", { class: `app-dot ${row.nokta ?? "bos"}`, "aria-hidden": true }),
        h("span", { class: "app-description" }, h("strong", { text: row.ad }), h("small", { text: row.ozet })), h("span", { text: row.etiket }));
      button.disabled = (!row.acilabilir && !row.indirilebilir) || (!this.appOpener && !row.indirilebilir);
      this.appsMenu.append(button);
    }
  }
  private async openApp(id: string) {
    if (!appRows(this.appsSnapshot.apps, this.appsSnapshot.durumlar).some(row => row.id === id && row.acilabilir)) return;
    try {
      const message = await this.appOpener?.(id);
      if (typeof message === "string") this.appsMenu.append(h("p", { class: "apps-message", role: "status", text: message }));
      else this.hideApps();
    } catch { this.appsMenu.append(h("p", { class: "apps-message", role: "status", text: "Uygulama açılamadı. Yeniden dene." })); }
  }
  onEvent(event: AfuEvent) { if (this.pausedAt === null) this.model.tick(Date.now()); this.model.onEvent(event); this.paint(); }
  setActive(on: boolean) { if (!on) this.hideApps(); this.active = on; this.el.hidden = !on; this.setVisible(on && !document.hidden); }
  setVisible(on: boolean) {
    if (!on) this.hideApps();
    this.stopTimer();
    this.el.style.setProperty("--pet-play", on && this.active ? "running" : "paused");
    for (const animation of this.previous.getAnimations()) { if (on && this.active) animation.play(); else animation.pause(); }
    this.oynatici.gorunurluk(on && this.active);
    if (!on || !this.active) { this.pausedAt ??= Date.now(); return; }
    if (this.pausedAt !== null) this.model.shift(Date.now() - this.pausedAt);
    this.pausedAt = null;
    this.run();
  }
  transition(reverse = false) { this.model.tick(Date.now()); this.model.setPose(reverse ? "donus" : "gecis"); this.paint(); }
  private stopTimer() { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; }
  private run() {
    this.model.tick(Date.now()); this.paint();
    // One short timer while visible; no rAF loop or poll while the pet is hidden.
    if (!this.reduced.matches) this.timer = window.setTimeout(() => { this.timer = null; if (this.active && !document.hidden && this.pausedAt === null) this.run(); }, 90);
  }
  /** Sallanmayı ve zamanlayıcısını durdurur, açıyı sıfırlar (hareket azaltma açılınca). */
  private sallanmaDurdur() {
    if (this.dragRaf !== null) cancelAnimationFrame(this.dragRaf);
    this.dragRaf = null;
    this.swingAngle = 0;
    this.swingVel = 0;
    this.fareHiz = 0;
    this.lastPhysicsAt = 0;
  }
  private runPhysics() {
    // Hareket azaltma tercihi: sallanma hiç çalışmaz.
    if (this.reduced.matches) { this.sallanmaDurdur(); this.paint(); return; }
    const tutuluyor = this.model.pose === "surukleme";
    if (!tutuluyor && Math.abs(this.swingAngle) < 0.1 && Math.abs(this.swingVel) < 0.1) {
      this.dragRaf = null;
      this.swingAngle = 0;
      this.swingVel = 0;
      this.fareHiz = 0;
      this.paint();
      return;
    }
    const simdi = performance.now();
    const dt = Math.min(0.25, Math.max(0, (simdi - this.lastPhysicsAt) / 1000)) || SARKAC_KARE_SN;
    this.lastPhysicsAt = simdi;
    const dx = window.screenX - this.lastWinX;
    this.lastWinX = window.screenX;
    let hedef = 0;
    if (tutuluyor) {
      const anlik = dx / dt;
      this.fareHiz += (anlik - this.fareHiz) * 0.35;
      // P5: stüdyodaki "Sallanma gücü" (tutma.guc) hedef açıyı ölçekler;
      // 50 tam güçtür, 0 sarkaç yoktur, 100 ve üstü ±25 derece ile sınırlıdır.
      hedef = sarkacHedef(this.fareHiz * (PET_TUTMA.guc / 50));
    } else this.fareHiz = 0;
    const sonuc = sarkac(this.swingAngle, this.swingVel, dt, hedef, tutuluyor);
    this.swingAngle = sonuc.adim;
    this.swingVel = sonuc.hiz;
    this.paint();
    this.dragRaf = requestAnimationFrame(() => this.runPhysics());
  }
  /** Görevin durumu (adadan gelir); petin kendi tepkisi yoksa ışık rengi bunu izler. */
  setDurum(durum: string) { this.gorevDurum = durum; this.el.dataset.durum = petDurum(this.model.pose, durum); }
  private paint() {
    const ifadeKare = this.ifade.tick(Date.now(), { bosta: this.ifadeBosta(), acik: this.ifadeAcik });
    const next = ifadeKare ?? (this.reduced.matches && ["bekleme", "gecis", "yuzme", "uyanma"].includes(this.model.pose) ? "idle_normal" : this.model.frame);
    this.el.dataset.pose = this.model.pose;
    this.el.dataset.durum = petDurum(this.model.pose, this.gorevDurum);
    // STÜDYO ÇİZİM BAŞLANGIÇ
    const ayar = PET_AYAR[this.model.pose];
    let scruffTx = 0;
    let scruffTy = 0;
    let extraTransform = '';
    const isDragging = this.model.pose === "surukleme" || this.model.pose === "geri_donus";
    const tutma = tutmaNoktasi(next);
    // Hareket azaltma tercihinde sallanma, uzama ve nefes hiç uygulanmaz.
    if (!this.reduced.matches && (this.dragRaf !== null || isDragging)) {
      const stretch = sarkacUzama(this.swingVel);
      const { nefes, bacak } = sarkacNefes(performance.now() - this.dragStart);
      extraTransform = ` rotate(${this.swingAngle + bacak * 0.5}deg) scaleY(${stretch}) translateY(${nefes}px) translateX(${bacak}px)`;
      if (isDragging) {
        const progress = Math.min(1, (performance.now() - this.dragStart) / 120);
        const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const kare = next;
        const scale = (PET_NORMALIZE.includes(this.model.pose) ? (PET_BOYUT[kare] || { olcek: 1 }).olcek : 1) * ayar.olcek / 100;
        
        // Tutma noktası (ense ya da elin üst ucu) imlecin tuttuğu yere gelir;
        // başlangıç karenin ayakları pencere altında olacak şekildedir.
        const kayma = PET_NORMALIZE.includes(this.model.pose) ? (PET_BOYUT[kare] || { x: 0, y: 0 }) : { x: 0, y: 0 };
        const targetTx = this.clickX - tutma.x - kayma.x * PET_PENCERE * ayar.olcek / 100;
        const targetTy = this.clickY - tutma.y - kayma.y * PET_PENCERE * ayar.olcek / 100;
        const startTx = (PET_PENCERE / 2 - tutma.x) * (1 - scale);
        const startTy = (PET_PENCERE - tutma.y) * (1 - scale);
        
        scruffTx = startTx + (targetTx - startTx) * easeOut;
        scruffTy = startTy + (targetTy - startTy) * easeOut;
      }
    }
    for (const image of [this.image, this.previous, this.canvas]) {
      // P7: canvas da aynı kareyi çizer, bu yüzden "önceki" kare yalnız previous'a aittir.
      const kare = image === this.previous ? (this.image.getAttribute("src") || "").replace(/^.*\/afu\/(pet\/|durum\/)/, (_, folder) => folder === "durum/" ? "durum/" : "").replace(/\.webp$/, "") : next;
      const olculu = PET_BOYUT[kare];
      const n = PET_NORMALIZE.includes(this.model.pose) ? (olculu || { olcek: 1, x: 0, y: 0 }) : { olcek: 1, x: 0, y: 0 };
      const isDraggingNow = this.dragRaf !== null || isDragging;
      const rawScale = n.olcek * ayar.olcek / 100;
      const rawTx = ayar.x + scruffTx + n.x * PET_PENCERE * ayar.olcek / 100;
      const rawTy = ayar.y + scruffTy + n.y * PET_PENCERE * ayar.olcek / 100;
      // Ölçülmüş alfa kutusu her kare için geçerli; kare yoksa tüm çerçeve sayılır.
      const kutu = olculu?.kutu ?? ([0, 0, 1, 1] as [number, number, number, number]);
      
      // Alt kenarda pay yok: ayaklar görev çubuğuna (pencerenin altına) değer.
      const fitted = sigdir(kutu, rawScale, rawTx, rawTy, PET_PENCERE, 6, isDraggingNow ? tutma.y : PET_PENCERE, isDraggingNow ? tutma.x : PET_PENCERE / 2, 0);

      image.style.transformOrigin = isDraggingNow ? `${tutma.x / PET_PENCERE * 100}% ${tutma.y / PET_PENCERE * 100}%` : "50% 100%";
      image.style.translate = `${fitted.x}px ${fitted.y}px`;
      image.style.scale = String(fitted.olcek);
      image.style.transform = extraTransform;
    }
    // STÜDYO ÇİZİM SON
    // P7: animasyonlu webp kare kare canvas'a çizilir (hız + döngü arası bekleme).
    // Hareket azaltma tercihinde veya çözücü yokken oynatıcı kapalı, <img> oynar.
    if (this.reduced.matches) this.oynatici.durdur();
    else this.oynatici.oynat(studyoKareYolu(next), ifadeKare ? IFADE_OYNATMA : PET_OYNATMA[this.model.pose]);
    this.balloon.textContent = this.model.balloon ?? "";
    this.balloon.hidden = this.model.balloon === null;
    if (next === this.frame) return;
    this.previous.src = this.image.src;
    this.image.src = studyoKareYolu(next);
    this.frame = next;
    for (const animation of this.previous.getAnimations()) animation.cancel();
    if (!this.reduced.matches) this.previous.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "forwards" });
  }
}
export function sigdir(
  kutu: [number, number, number, number],
  olcek: number,
  x: number,
  y: number,
  pencere = 256,
  pay = 6,
  originY = 256,
  originX = pencere / 2,
  altPay = pay
) {
  const [L_ratio, T_ratio, R_ratio, B_ratio] = kutu;
  const L0 = L_ratio * pencere;
  const T0 = T_ratio * pencere;
  const R0 = R_ratio * pencere;
  const B0 = B_ratio * pencere;
  const w0 = R0 - L0;
  const h0 = B0 - T0;
  const maxW = pencere - 2 * pay;
  const maxH = pencere - pay - altPay;

  let yeniOlcek = olcek;
  if (w0 > 0 && w0 * yeniOlcek > maxW) yeniOlcek = maxW / w0;
  if (h0 > 0 && h0 * yeniOlcek > maxH) yeniOlcek = maxH / h0;

  const scaledL = (L0 - originX) * yeniOlcek + originX;
  const scaledR = (R0 - originX) * yeniOlcek + originX;
  const minX = pay - scaledL;
  const maxX = pencere - pay - scaledR;

  let yeniX = x;
  if (yeniX < minX) yeniX = minX;
  if (yeniX > maxX) yeniX = maxX;

  const scaledT = (T0 - originY) * yeniOlcek + originY;
  const scaledB = (B0 - originY) * yeniOlcek + originY;
  const minY = pay - scaledT;
  const maxY = pencere - altPay - scaledB;

  let yeniY = y;
  if (yeniY < minY) yeniY = minY;
  if (yeniY > maxY) yeniY = maxY;

  return { olcek: yeniOlcek, x: yeniX, y: yeniY };
}
