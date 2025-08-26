import { useState, useEffect } from 'react';
import { problemService, quizSetService } from '../lib/database';
import { qrShareService, type ShareData } from '../lib/qrShare';
import { QRScanner } from './QRScanner';
import type { Problem, QuizSet } from '../types';

interface ShareCenterProps {
  onBack: () => void;
}

export function ShareCenter({ onBack }: ShareCenterProps) {
  const [currentTab, setCurrentTab] = useState<'share' | 'import' | 'myQRs' | 'files'>('share');
  
  // Language state management
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja');
  
  // QR作成用の状態
  const [shareType, setShareType] = useState<'problem' | 'quizSet'>('problem');
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const [availableItems, setAvailableItems] = useState<(Problem | QuizSet)[]>([]);
  const [authorName, setAuthorName] = useState('Anonymous');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  
  // QR読み取り用の状態
  const [showScanner, setShowScanner] = useState(false);
  const [manualQRInput, setManualQRInput] = useState('');
  const [importedData, setImportedData] = useState<ShareData | null>(null);
  
  // 作成済みQR管理用の状態
  const [createdQRs, setCreatedQRs] = useState<Array<{
    id: string;
    type: 'problem' | 'quizSet';
    title: string;
    author: string;
    createdAt: Date;
    qrCode: string;
    dataSize: number;
  }>>([]);
  
  // ドラッグ＆ドロップ用の状態
  const [isDragOver, setIsDragOver] = useState(false);

  // ヘルパー関数
  const formatDataSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const formatDate = (date: Date): string => {
    const locale = language === 'ja' ? 'ja-JP' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  useEffect(() => {
    loadData();
    loadCreatedQRs();
  }, []);

  // Language change detection
  useEffect(() => {
    const handleStorageChange = () => {
      setLanguage(localStorage.getItem('language') || 'ja');
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 定期的に言語設定をチェック
    const interval = setInterval(() => {
      const currentLang = localStorage.getItem('language') || 'ja';
      if (currentLang !== language) {
        setLanguage(currentLang);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [language]);

  // Translation objects
  const t = {
    ja: {
      pageTitle: '📱 QRコード共有センター',
      buttons: {
        back: '← 戻る',
        createQR: '📱 QRコードを生成',
        scanCamera: '📸 カメラでQRコードをスキャン',
        analyzeData: '📥 データを解析',
        importExecute: '✅ インポート実行',
        cancel: '❌ キャンセル',
        save: '💾 保存',
        delete: '🗑️削除',
        download: '💾 QRコードをダウンロード',
        showContent: '📋 内容を表示',
        createQRCode: '📤 QRコードを作成する',
        downloadFull: '📁 完全版ダウンロード（問題も含む）',
        downloadLight: '📋 軽量版ダウンロード（IDのみ）',
        downloadProblemFile: '📁 問題ファイルをダウンロード'
      },
      tabs: {
        share: '📤 QR作成・共有',
        import: '📥 QR読み取り・インポート',
        myQRs: '📋 作成したQR',
        files: '📁 ファイル共有'
      },
      shareSection: {
        title: '📱 QRコード共有について',
        description: '問題や問題集をQRコードとして生成し、他のユーザーと簡単に共有できます。QRコードをスキャンするだけでデータを取り込めます。',
        limitationsTitle: '📏 共有制限について',
        limitations: {
          singleProblem: '単一問題',
          singleProblemDesc: '制限なし（通常数百バイト）',
          quizSet: '問題集',
          quizSetDesc: '2KB制限（問題IDのみ共有）',
          estimate: '目安',
          estimateDesc: '100-500問程度まで共有可能',
          note: '注意',
          noteDesc: '問題の実際の内容は共有されません'
        },
        testButtons: {
          createTestSet: '🧪 テスト用大問題集を作成 (100問)',
          createMegaSet: '🚀 超大問題集を作成 (1000問)',
          createGigaSet: '🔥 巨大問題集を作成 (5000問)'
        }
      },
      form: {
        shareType: '共有タイプ',
        problem: '問題',
        quizSet: '問題集',
        selectProblem: '問題を選択',
        selectQuizSet: '問題集を選択',
        selectOption: '選択してください',
        authorName: '作成者名',
        authorPlaceholder: 'あなたの名前を入力',
        dataSize: 'データサイズ:',
        problemCount: '📊 問題数:',
        valid: '✅ 共有可能',
        invalid: '❌ サイズ超過',
        limit: '制限:'
      },
      importSection: {
        title: '📥 QRコードインポート',
        description: '他のユーザーが共有したQRコードをスキャンまたは手動入力して、問題や問題集を取り込めます。',
        fileUploadTitle: '📁 QR画像ファイルから読み取り',
        dragDropArea: 'QR画像をドラッグ＆ドロップまたはクリック',
        dragDropActive: 'ファイルをドロップしてください',
        supportedFormats: 'PNG, JPG, GIF形式に対応',
        manualInput: '手動でQRデータを入力',
        manualPlaceholder: 'QRコードから読み取ったデータを貼り付けてください',
        previewTitle: '📋 インポート予定のデータ',
        type: '種類:',
        author: '作成者:',
        createdDate: '作成日:',
        question: '問題:',
        quizSetName: '問題集名:'
      },
      myQRsSection: {
        title: '📋 作成したQRコード一覧',
        description: 'これまでに作成したQRコードの履歴です。再度共有したり、削除することができます。',
        noQRs: '🔍 まだQRコードが作成されていません',
        qrInfo: {
          type: '種類:',
          author: '作成者:',
          createdDate: '作成日:',
          size: 'サイズ:'
        }
      },
      filesSection: {
        title: '📁 ファイル形式での共有',
        description: '問題や問題集を .minguella ファイルとして保存・共有できます。ファイルサイズの制限がなく、大量の問題も共有可能です。',
        featuresTitle: '📋 ファイル共有の特徴',
        features: {
          noLimit: 'サイズ制限なし',
          noLimitDesc: '何問でも共有可能',
          fullData: '完全なデータ',
          fullDataDesc: '問題の内容も含めて共有',
          jsonFormat: 'JSONファイル',
          jsonFormatDesc: '可読性の高い形式',
          easyShare: '簡単共有',
          easyShareDesc: 'メール、クラウドドライブ等で送信'
        },
        sizeComparison: '📊 容量比較例',
        createDownloadTitle: '📤 ファイル作成・ダウンロード',
        importTitle: '📥 ファイル読み込み・インポート',
        selectFile: '.minguellaファイルを選択',
        supportedFiles: '.minguella または .json ファイルに対応',
        importNotice: '⚠️ インポート時の注意',
        importNotes: {
          fullVersion: '完全版',
          fullVersionDesc: '問題も含めて自動的にインポート',
          lightVersion: '軽量版',
          lightVersionDesc: '同じ問題IDが必要（推奨しません）',
          duplicate: '重複',
          duplicateDesc: '同じ問題でも新しいIDで追加されます',
          backup: 'バックアップ',
          backupDesc: 'インポート前にバックアップを推奨'
        },
        shareOptions: '📊 共有オプション',
        formats: {
          qrCode: 'QRコード: 最大2KB（100-500問のID）',
          file100: 'ファイル（100問完全版）: ~50KB',
          file1000: 'ファイル（1000問完全版）: ~500KB',
          file5000: 'ファイル（5000問完全版）: ~2.5MB'
        }
      },
      loading: {
        generatingQR: 'QRコード生成中...'
      },
      messages: {
        qrGenerated: '📱 生成されたQRコード',
        scanThis: 'このQRコードを相手にスキャンしてもらってください',
        qrContent: '🔍 QRコードの内容（デバッグ用）:',
        problemImported: '問題をインポートしました！',
        quizSetImported: '問題集をインポートしました！',
        fullQuizSetImported: '🎉 完全な問題集をインポートしました！',
        qrReadSuccess: '🎉 QRコードの読み取りが完了しました！',
        fileDownloaded: '✅ ファイルをダウンロードしました！',
        fileName: 'ファイル名:',
        testSetCreated: '✅ テスト用問題集を作成しました！',
        megaSetCreated: '✅ 巨大問題集を作成しました！',
        confirmDelete: 'このQRコードを削除しますか？',
        confirmMegaSet: '問の巨大問題集を作成します。時間がかかる場合があります。続行しますか？',
        problemCreating: '問の問題を作成中...しばらくお待ちください',
        createTime: '作成時間:',
        dataLoadError: 'データ読み込みエラー:',
        qrLoadError: 'QR読み込みエラー:',
        qrSaveError: 'QR保存エラー:',
        qrCreateError: 'QR作成エラー:',
        qrCreateFailed: 'QRコードの作成に失敗しました:',
        qrReadFailed: 'QRコードの読み取りに失敗しました:',
        importFailed: 'データのインポートに失敗しました:',
        fileTooLarge: 'データサイズが大きすぎます',
        sizeLimit: '2KB以下にしてください。',
        selectItem: '選択されたアイテムが見つかりません',
        imageOnly: '画像ファイルを選択してください',
        dropImageOnly: '画像ファイルをドロップしてください',
        enterQRData: 'QRコードデータを入力してください',
        qrParseFailed: 'QRコードデータの解析に失敗しました:',
        fileImportFailed: 'ファイルのインポートに失敗しました:',
        fileDownloadFailed: 'ファイルのダウンロードに失敗しました:',
        invalidFileFormat: '無効なファイル形式です',
        qrReadButParseFailed: 'QRコードは読み取れましたが、データの解析に失敗しました:',
        qrReadFinalFailed: 'QRコードの読み取りに失敗しました:',
        progressReport: '問題作成進捗:'
      },
      units: {
        questions: '問',
        problems: '問題数:',
        seconds: '秒',
        bytes: 'B',
        kilobytes: 'KB',
        megabytes: 'MB'
      }
    },
    en: {
      pageTitle: '📱 QR Code Share Center',
      buttons: {
        back: '← Back',
        createQR: '📱 Generate QR Code',
        scanCamera: '📸 Scan QR Code with Camera',
        analyzeData: '📥 Analyze Data',
        importExecute: '✅ Execute Import',
        cancel: '❌ Cancel',
        save: '💾 Save',
        delete: '🗑️ Delete',
        download: '💾 Download QR Code',
        showContent: '📋 Show Content',
        createQRCode: '📤 Create QR Code',
        downloadFull: '📁 Download Full Version (with problems)',
        downloadLight: '📋 Download Light Version (IDs only)',
        downloadProblemFile: '📁 Download Problem File'
      },
      tabs: {
        share: '📤 QR Creation & Share',
        import: '📥 QR Scan & Import',
        myQRs: '📋 Created QRs',
        files: '📁 File Share'
      },
      shareSection: {
        title: '📱 About QR Code Sharing',
        description: 'Generate problems or quiz sets as QR codes and share them easily with other users. Just scan the QR code to import the data.',
        limitationsTitle: '📏 Sharing Limitations',
        limitations: {
          singleProblem: 'Single Problem',
          singleProblemDesc: 'No limit (usually hundreds of bytes)',
          quizSet: 'Quiz Set',
          quizSetDesc: '2KB limit (problem IDs only)',
          estimate: 'Estimate',
          estimateDesc: 'Up to 100-500 problems can be shared',
          note: 'Note',
          noteDesc: 'Actual problem content is not shared'
        },
        testButtons: {
          createTestSet: '🧪 Create Test Quiz Set (100 problems)',
          createMegaSet: '🚀 Create Mega Quiz Set (1000 problems)',
          createGigaSet: '🔥 Create Giga Quiz Set (5000 problems)'
        }
      },
      form: {
        shareType: 'Share Type',
        problem: 'Problem',
        quizSet: 'Quiz Set',
        selectProblem: 'Select Problem',
        selectQuizSet: 'Select Quiz Set',
        selectOption: 'Please select',
        authorName: 'Author Name',
        authorPlaceholder: 'Enter your name',
        dataSize: 'Data Size:',
        problemCount: '📊 Problem Count:',
        valid: '✅ Shareable',
        invalid: '❌ Size exceeded',
        limit: 'Limit:'
      },
      importSection: {
        title: '📥 QR Code Import',
        description: 'Scan or manually enter QR codes shared by other users to import problems or quiz sets.',
        fileUploadTitle: '📁 Read from QR Image File',
        dragDropArea: 'Drag & drop QR image or click',
        dragDropActive: 'Drop file here',
        supportedFormats: 'PNG, JPG, GIF formats supported',
        manualInput: 'Manually enter QR data',
        manualPlaceholder: 'Paste data read from QR code here',
        previewTitle: '📋 Data to be Imported',
        type: 'Type:',
        author: 'Author:',
        createdDate: 'Created Date:',
        question: 'Problem:',
        quizSetName: 'Quiz Set Name:'
      },
      myQRsSection: {
        title: '📋 Created QR Code List',
        description: 'History of QR codes you have created. You can share them again or delete them.',
        noQRs: '🔍 No QR codes created yet',
        qrInfo: {
          type: 'Type:',
          author: 'Author:',
          createdDate: 'Created Date:',
          size: 'Size:'
        }
      },
      filesSection: {
        title: '📁 File Format Sharing',
        description: 'Save and share problems or quiz sets as .minguella files. No file size limit, can share large amounts of problems.',
        featuresTitle: '📋 File Sharing Features',
        features: {
          noLimit: 'No Size Limit',
          noLimitDesc: 'Can share any number of problems',
          fullData: 'Complete Data',
          fullDataDesc: 'Includes problem content for sharing',
          jsonFormat: 'JSON File',
          jsonFormatDesc: 'Highly readable format',
          easyShare: 'Easy Sharing',
          easyShareDesc: 'Send via email, cloud drive, etc.'
        },
        sizeComparison: '📊 Size Comparison Example',
        createDownloadTitle: '📤 File Creation & Download',
        importTitle: '📥 File Loading & Import',
        selectFile: 'Select .minguella file',
        supportedFiles: '.minguella or .json files supported',
        importNotice: '⚠️ Import Notes',
        importNotes: {
          fullVersion: 'Full Version',
          fullVersionDesc: 'Automatically imports problems too',
          lightVersion: 'Light Version',
          lightVersionDesc: 'Requires same problem IDs (not recommended)',
          duplicate: 'Duplicates',
          duplicateDesc: 'Same problems will be added with new IDs',
          backup: 'Backup',
          backupDesc: 'Backup recommended before import'
        },
        shareOptions: '📊 Share Options',
        formats: {
          qrCode: 'QR Code: Max 2KB (100-500 problem IDs)',
          file100: 'File (100 problems full): ~50KB',
          file1000: 'File (1000 problems full): ~500KB',
          file5000: 'File (5000 problems full): ~2.5MB'
        }
      },
      loading: {
        generatingQR: 'Generating QR code...'
      },
      messages: {
        qrGenerated: '📱 Generated QR Code',
        scanThis: 'Have others scan this QR code',
        qrContent: '🔍 QR Code Content (Debug):',
        problemImported: 'Problem imported!',
        quizSetImported: 'Quiz set imported!',
        fullQuizSetImported: '🎉 Complete quiz set imported!',
        qrReadSuccess: '🎉 QR code reading completed!',
        fileDownloaded: '✅ File downloaded!',
        fileName: 'File name:',
        testSetCreated: '✅ Test quiz set created!',
        megaSetCreated: '✅ Mega quiz set created!',
        confirmDelete: 'Delete this QR code?',
        confirmMegaSet: ' problems. This may take some time. Continue?',
        problemCreating: ' problems...please wait',
        createTime: 'Creation time:',
        dataLoadError: 'Data loading error:',
        qrLoadError: 'QR loading error:',
        qrSaveError: 'QR save error:',
        qrCreateError: 'QR creation error:',
        qrCreateFailed: 'QR code creation failed:',
        qrReadFailed: 'QR code reading failed:',
        importFailed: 'Data import failed:',
        fileTooLarge: 'Data size too large',
        sizeLimit: 'Please keep under 2KB.',
        selectItem: 'Selected item not found',
        imageOnly: 'Please select an image file',
        dropImageOnly: 'Please drop an image file',
        enterQRData: 'Please enter QR code data',
        qrParseFailed: 'QR code data parsing failed:',
        fileImportFailed: 'File import failed:',
        fileDownloadFailed: 'File download failed:',
        invalidFileFormat: 'Invalid file format',
        qrReadButParseFailed: 'QR code read successfully but data parsing failed:',
        qrReadFinalFailed: 'QR code reading failed:',
        progressReport: 'Problem creation progress:'
      },
      units: {
        questions: ' problems',
        problems: 'Problem count:',
        seconds: ' sec',
        bytes: 'B',
        kilobytes: 'KB',
        megabytes: 'MB'
      }
    }
  };

  const currentLang = language as keyof typeof t;

  useEffect(() => {
    loadData();
  }, [shareType]);

  const loadData = async () => {
    try {
      const [problems, quizSets] = await Promise.all([
        problemService.getAll(),
        quizSetService.getAll()
      ]);
      
      if (shareType === 'problem') {
        setAvailableItems(problems);
      } else {
        setAvailableItems(quizSets);
      }
    } catch (error) {
      console.error(t[currentLang].messages.dataLoadError, error);
    }
  };

  const loadCreatedQRs = () => {
    try {
      const saved = localStorage.getItem('createdQRs');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCreatedQRs(parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt)
        })));
      }
    } catch (error) {
      console.error(t[currentLang].messages.qrLoadError, error);
    }
  };

  const saveCreatedQR = (qrData: any) => {
    try {
      const updated = [...createdQRs, qrData];
      setCreatedQRs(updated);
      localStorage.setItem('createdQRs', JSON.stringify(updated));
    } catch (error) {
      console.error(t[currentLang].messages.qrSaveError, error);
    }
  };

  const handleCreateQR = async () => {
    if (!selectedItem || isGeneratingQR) return;

    setIsGeneratingQR(true);
    setGeneratedQR(null);

    try {
      console.log('QR作成開始:', { selectedItem, shareType, authorName });
      
      const selectedData = availableItems.find((item: any) => 
        shareType === 'problem' ? item.id === selectedItem : item.id === selectedItem
      );

      if (!selectedData) {
        throw new Error(t[currentLang].messages.selectItem);
      }

      console.log('選択されたデータ:', selectedData);

      // データサイズをチェック
      if (!qrShareService.isDataSizeValid(selectedData, shareType)) {
        const size = qrShareService.calculateDataSize(selectedData, shareType);
        throw new Error(`${t[currentLang].messages.fileTooLarge} (${formatDataSize(size)}). ${t[currentLang].messages.sizeLimit}`);
      }

      // QRコードを生成
      const qrCode = await qrShareService.generateQRCode(selectedData, shareType, authorName);
      console.log('生成されたQRコード:', qrCode.substring(0, 100) + '...');
      setGeneratedQR(qrCode);

      // テスト用：生成されたデータを即座に解析してみる
      try {
        const testParseData = qrShareService.parseQRData(qrCode.split(',')[1]); // data:image/png;base64, の部分を除去
        console.log('テスト解析成功:', testParseData);
      } catch (testError) {
        console.warn('テスト解析失敗 - QRコードに画像データが含まれているため正常:', testError);
      }

      // 作成したQRを保存
      const qrData = {
        id: `qr_${Date.now()}`,
        type: shareType,
        title: shareType === 'problem' ? (selectedData as Problem).question : (selectedData as QuizSet).name,
        author: authorName,
        createdAt: new Date(),
        qrCode,
        dataSize: qrShareService.calculateDataSize(selectedData, shareType)
      };
      
      saveCreatedQR(qrData);
      console.log('QR作成完了:', qrData);
    } catch (error: any) {
      console.error(t[currentLang].messages.qrCreateError, error);
      alert(`${t[currentLang].messages.qrCreateFailed} ${error.message}`);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleScanSuccess = async (data: string) => {
    try {
      const shareData = qrShareService.parseQRData(data);
      setImportedData(shareData);
      setShowScanner(false);
    } catch (error: any) {
      alert(`${t[currentLang].messages.qrReadFailed} ${error.message}`);
    }
  };

  const handleImportData = async (shareData: ShareData) => {
    try {
      if (shareData.type === 'problem') {
        const problem = shareData.data as Problem;
        const newProblem: any = {
          category: problem.category,
          question: problem.question,
          type: problem.type,
          explanation: problem.explanation
        };
        
        if (problem.type === 'multiple-choice') {
          newProblem.options = problem.options;
          newProblem.correctAnswer = problem.correctAnswer;
          newProblem.answer = false; // Default value for true-false type
        } else {
          newProblem.answer = problem.answer;
          newProblem.options = []; // Default empty array
          newProblem.correctAnswer = 0; // Default value
        }
        
        await problemService.add(newProblem);
        alert(t[currentLang].messages.problemImported);
      } else {
        const quizSet = shareData.data as QuizSet;
        await quizSetService.save({
          name: quizSet.name,
          problemIds: quizSet.problemIds,
          createdAt: new Date()
        });
        alert(t[currentLang].messages.quizSetImported);
      }
      setImportedData(null);
    } catch (error: any) {
      alert(`${t[currentLang].messages.importFailed} ${error.message}`);
    }
  };

  const processImageFile = async (file: File) => {
    try {
      console.log('画像ファイル処理:', file.name, file.type, file.size);
      
      // ファイルタイプチェック
      if (!file.type.startsWith('image/')) {
        throw new Error(t[currentLang].messages.imageOnly);
      }
      
      // QRスキャナーライブラリを動的インポート
      const QrScanner = (await import('qr-scanner')).default;
      
      console.log('QRコードスキャン開始...');
      const result = await QrScanner.scanImage(file);
      
      console.log('QRコードスキャン成功:', result);
      console.log('読み取ったデータ長:', result.length);
      
      // 読み取ったデータを手動入力欄にセット
      setManualQRInput(result);
      
      // 自動的に解析を実行
      try {
        const shareData = qrShareService.parseQRData(result);
        console.log('自動解析成功:', shareData);
        setImportedData(shareData);
        alert(t[currentLang].messages.qrReadSuccess);
      } catch (parseError: any) {
        console.error('自動解析失敗:', parseError);
        alert(`${t[currentLang].messages.qrReadButParseFailed} ${parseError.message}`);
      }
    } catch (error: any) {
      console.error('画像読み取りエラー:', error);
      alert(`${t[currentLang].messages.qrReadFinalFailed} ${error.message || 'Unknown error'}`);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await processImageFile(file);
    
    // ファイル入力をリセット
    event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await processImageFile(imageFile);
    } else {
      alert(t[currentLang].messages.dropImageOnly);
    }
  };

  const handleManualImport = () => {
    if (!manualQRInput.trim()) {
      alert(t[currentLang].messages.enterQRData);
      return;
    }
    
    try {
      console.log('手動入力されたQRデータ:', manualQRInput.trim());
      console.log('データ長:', manualQRInput.trim().length);
      const shareData = qrShareService.parseQRData(manualQRInput.trim());
      console.log('解析成功:', shareData);
      setImportedData(shareData);
    } catch (error: any) {
      console.error('手動インポートエラー:', error);
      alert(`${t[currentLang].messages.qrParseFailed} ${error.message}`);
    }
  };

  const deleteCreatedQR = (qrId: string) => {
    if (confirm(t[currentLang].messages.confirmDelete)) {
      const updated = createdQRs.filter(qr => qr.id !== qrId);
      setCreatedQRs(updated);
      localStorage.setItem('createdQRs', JSON.stringify(updated));
    }
  };

  const createTestQuizSet = async () => {
    try {
      // まず、テスト用の問題を100問作成
      const problems = await problemService.getAll();
      let testProblemIds: number[] = [];
      
      if (problems.length < 100) {
        // 足りない分のテスト問題を作成
        const needed = 100 - problems.length;
        for (let i = 0; i < needed; i++) {
          const problemId = await problemService.add({
            category: 'テスト',
            question: `テスト問題 ${problems.length + i + 1}: これはQRコード共有テスト用の問題です。`,
            type: 'true-false',
            answer: true,
            explanation: 'これはテスト用の問題です。'
          });
          testProblemIds.push(problemId);
        }
      }
      
      // 既存の問題から100問選択
      const allProblems = await problemService.getAll();
      const selected100 = allProblems.slice(0, 100).map(p => p.id!);
      
      // テスト用問題集を作成
      const testQuizSetId = await quizSetService.save({
        name: `QRテスト用大問題集 (${selected100.length}問)`,
        problemIds: selected100,
        createdAt: new Date()
      });
      
      // データを再読み込み
      await loadData();
      
      alert(`${t[currentLang].messages.testSetCreated}\n${t[currentLang].units.problems} ${selected100.length}${t[currentLang].units.questions}\n問題集ID: ${testQuizSetId}`);
      
    } catch (error: any) {
      console.error('テスト問題集作成エラー:', error);
      alert(`❌ ${t[currentLang].messages.testSetCreated.replace('✅', '❌')}: ${error.message}`);
    }
  };

  const createMegaTestQuizSet = async (problemCount: number) => {
    if (!confirm(`${problemCount}${t[currentLang].messages.confirmMegaSet}`)) {
      return;
    }

    try {
      const startTime = Date.now();
      alert(`📝 ${problemCount}${t[currentLang].messages.problemCreating}`);
      
      // 既存の問題を取得
      const existingProblems = await problemService.getAll();
      const newProblemIds: number[] = [];
      
      // 足りない分の問題を作成
      const needed = Math.max(0, problemCount - existingProblems.length);
      
      for (let i = 0; i < needed; i++) {
        const problemId = await problemService.add({
          category: `メガテスト${Math.floor(i / 100) + 1}`,
          question: `巨大問題集テスト問題 ${existingProblems.length + i + 1}: この問題は大容量共有のテスト用です。`,
          type: Math.random() > 0.5 ? 'true-false' : 'multiple-choice',
          answer: Math.random() > 0.5,
          options: ['選択肢A', '選択肢B', '選択肢C', '選択肢D'],
          correctAnswer: Math.floor(Math.random() * 4),
          explanation: `これは${problemCount}問問題集のテスト用問題です。問題番号: ${existingProblems.length + i + 1}`
        });
        newProblemIds.push(problemId);
        
        // 進捗表示（100問ごと）
        if ((i + 1) % 100 === 0) {
          console.log(`${t[currentLang].messages.progressReport} ${i + 1}/${needed}`);
        }
      }
      
      // 全問題から指定数を選択
      const allProblems = await problemService.getAll();
      const selectedProblems = allProblems.slice(0, problemCount).map(p => p.id!);
      
      // 巨大問題集を作成
      const megaQuizSetId = await quizSetService.save({
        name: `巨大問題集 (${problemCount}問) - ${new Date().toLocaleDateString()}`,
        problemIds: selectedProblems,
        createdAt: new Date()
      });
      
      // データを再読み込み
      await loadData();
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);
      
      alert(`${t[currentLang].messages.megaSetCreated}\n${t[currentLang].units.problems} ${problemCount}${t[currentLang].units.questions}\n${t[currentLang].messages.createTime} ${duration}${t[currentLang].units.seconds}\n問題集ID: ${megaQuizSetId}`);
      
    } catch (error: any) {
      console.error('巨大問題集作成エラー:', error);
      alert(`❌ ${t[currentLang].messages.megaSetCreated.replace('✅', '❌')}: ${error.message}`);
    }
  };

  // ファイル共有用の関数
  const downloadAsFile = async (item: Problem | QuizSet, type: 'problem' | 'quizSet', includeFullData: boolean = true) => {
    try {
      let exportData: any;
      let fileName: string;
      
      if (includeFullData) {
        // 完全なデータを含む
        if (type === 'problem') {
          exportData = {
            version: '1.0.0',
            type: 'problem',
            timestamp: Date.now(),
            author: authorName || 'Anonymous',
            data: item
          };
          fileName = `problem-${(item as Problem).question.substring(0, 20).replace(/[^\w\s]/gi, '')}-${Date.now()}.minguella`;
        } else {
          const quizSet = item as QuizSet;
          // 問題集の場合は実際の問題も含める
          const problems = await problemService.getByIds(quizSet.problemIds);
          exportData = {
            version: '1.0.0',
            type: 'quizSet-full',
            timestamp: Date.now(),
            author: authorName || 'Anonymous',
            data: {
              quizSet: quizSet,
              problems: problems
            }
          };
          fileName = `quizset-${quizSet.name.substring(0, 20).replace(/[^\w\s]/gi, '')}-${Date.now()}.minguella`;
        }
      } else {
        // 軽量版（問題集はIDのみ）
        exportData = {
          version: '1.0.0',
          type: type,
          timestamp: Date.now(),
          author: authorName || 'Anonymous',
          data: item
        };
        fileName = `${type}-light-${Date.now()}.minguella`;
      }
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      
      URL.revokeObjectURL(url);
      
      alert(`${t[currentLang].messages.fileDownloaded}\n${t[currentLang].messages.fileName} ${fileName}\nサイズ: ${formatDataSize(blob.size)}`);
      
    } catch (error: any) {
      console.error('ファイルダウンロードエラー:', error);
      alert(`❌ ${t[currentLang].messages.fileDownloadFailed} ${error.message}`);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('ファイル読み込み開始:', file.name, file.size);
      
      const text = await file.text();
      const importData = JSON.parse(text);
      
      console.log('インポートデータ:', importData);
      
      if (!importData.version || !importData.type || !importData.data) {
        throw new Error(t[currentLang].messages.invalidFileFormat);
      }
      
      if (importData.type === 'problem') {
        const problem = importData.data;
        const newProblem: any = {
          category: problem.category,
          question: problem.question,
          type: problem.type,
          explanation: problem.explanation
        };
        
        if (problem.type === 'multiple-choice') {
          newProblem.options = problem.options;
          newProblem.correctAnswer = problem.correctAnswer;
          newProblem.answer = false;
        } else {
          newProblem.answer = problem.answer;
          newProblem.options = [];
          newProblem.correctAnswer = 0;
        }
        
        await problemService.add(newProblem);
        alert(`📝 ${t[currentLang].messages.problemImported}`);
        
      } else if (importData.type === 'quizSet') {
        const quizSet = importData.data;
        await quizSetService.save({
          name: `${quizSet.name} (インポート)`,
          problemIds: quizSet.problemIds,
          createdAt: new Date()
        });
        alert(`📚 ${t[currentLang].messages.quizSetImported}`);
        
      } else if (importData.type === 'quizSet-full') {
        // 完全な問題集（問題も含む）
        const { quizSet, problems } = importData.data;
        const newProblemIds: number[] = [];
        
        // 問題を先にインポート
        for (const problem of problems) {
          const newProblem: any = {
            category: problem.category,
            question: problem.question,
            type: problem.type,
            explanation: problem.explanation
          };
          
          if (problem.type === 'multiple-choice') {
            newProblem.options = problem.options;
            newProblem.correctAnswer = problem.correctAnswer;
            newProblem.answer = false;
          } else {
            newProblem.answer = problem.answer;
            newProblem.options = [];
            newProblem.correctAnswer = 0;
          }
          
          const problemId = await problemService.add(newProblem);
          newProblemIds.push(problemId);
        }
        
        // 問題集をインポート
        await quizSetService.save({
          name: `${quizSet.name} (完全インポート)`,
          problemIds: newProblemIds,
          createdAt: new Date()
        });
        
        alert(`${t[currentLang].messages.fullQuizSetImported}\n${t[currentLang].units.problems} ${problems.length}${t[currentLang].units.questions}\n問題集名: ${quizSet.name}`);
      }
      
      // データを再読み込み
      await loadData();
      
    } catch (error: any) {
      console.error('ファイルインポートエラー:', error);
      alert(`❌ ${t[currentLang].messages.fileImportFailed} ${error.message}`);
    }
    
    // ファイル入力をリセット
    event.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg relative" style={{ zIndex: showScanner ? 1 : 'auto' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t[currentLang].pageTitle}
        </h2>
        <button
          onClick={onBack}
          className="px-4 py-2 quiz-action-button rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105"
        >
          {t[currentLang].buttons.back}
        </button>
      </div>

      {/* タブナビゲーション */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setCurrentTab('share')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            currentTab === 'share'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {t[currentLang].tabs.share}
        </button>
        <button
          onClick={() => setCurrentTab('import')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            currentTab === 'import'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {t[currentLang].tabs.import}
        </button>
        <button
          onClick={() => setCurrentTab('myQRs')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            currentTab === 'myQRs'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {t[currentLang].tabs.myQRs}
        </button>
        <button
          onClick={() => setCurrentTab('files')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
            currentTab === 'files'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {t[currentLang].tabs.files}
        </button>
      </div>

      {/* QR作成・共有タブ */}
      {currentTab === 'share' && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              {t[currentLang].shareSection.title}
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-sm mb-3">
              {t[currentLang].shareSection.description}
            </p>
            <div className="bg-white dark:bg-blue-800/30 rounded p-3 text-xs">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">{t[currentLang].shareSection.limitationsTitle}</h4>
              <ul className="text-blue-700 dark:text-blue-200 space-y-1">
                <li>• <strong>{t[currentLang].shareSection.limitations.singleProblem}</strong>: {t[currentLang].shareSection.limitations.singleProblemDesc}</li>
                <li>• <strong>{t[currentLang].shareSection.limitations.quizSet}</strong>: {t[currentLang].shareSection.limitations.quizSetDesc}</li>
                <li>• <strong>{t[currentLang].shareSection.limitations.estimate}</strong>: {t[currentLang].shareSection.limitations.estimateDesc}</li>
                <li>• <strong>{t[currentLang].shareSection.limitations.note}</strong>: {t[currentLang].shareSection.limitations.noteDesc}</li>
              </ul>
              <div className="space-y-2 mt-2">
                <button
                  onClick={createTestQuizSet}
                  className="block w-full px-3 py-1 quiz-action-button rounded text-xs transition-colors"
                >
                  {t[currentLang].shareSection.testButtons.createTestSet}
                </button>
                <button
                  onClick={() => createMegaTestQuizSet(1000)}
                  className="block w-full px-3 py-1 quiz-action-button rounded text-xs transition-colors"
                >
                  {t[currentLang].shareSection.testButtons.createMegaSet}
                </button>
                <button
                  onClick={() => createMegaTestQuizSet(5000)}
                  className="block w-full px-3 py-1 quiz-action-button rounded text-xs transition-colors"
                >
                  {t[currentLang].shareSection.testButtons.createGigaSet}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[currentLang].form.shareType}
                </label>
                <div className="space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="problem"
                      checked={shareType === 'problem'}
                      onChange={(e) => setShareType(e.target.value as 'problem' | 'quizSet')}
                      className="form-radio text-blue-600"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{t[currentLang].form.problem}</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="quizSet"
                      checked={shareType === 'quizSet'}
                      onChange={(e) => setShareType(e.target.value as 'problem' | 'quizSet')}
                      className="form-radio text-blue-600"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{t[currentLang].form.quizSet}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {shareType === 'problem' ? t[currentLang].form.selectProblem : t[currentLang].form.selectQuizSet}
                </label>
                <select
                  value={selectedItem || ''}
                  onChange={(e) => setSelectedItem(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t[currentLang].form.selectOption}</option>
                  {availableItems.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {shareType === 'problem' ? item.question : item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[currentLang].form.authorName}
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder={t[currentLang].form.authorPlaceholder}
                />
              </div>

              {selectedItem && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t[currentLang].form.dataSize} {formatDataSize(qrShareService.calculateDataSize(
                      availableItems.find((item: any) => item.id === selectedItem)!,
                      shareType
                    ))}
                  </div>
                  {shareType === 'quizSet' && (() => {
                    const selectedQuizSet = availableItems.find((item: any) => item.id === selectedItem) as QuizSet;
                    const problemCount = selectedQuizSet?.problemIds?.length || 0;
                    const sizeLimit = 2048;
                    const currentSize = qrShareService.calculateDataSize(selectedQuizSet, shareType);
                    const isValid = currentSize <= sizeLimit;
                    
                    return (
                      <div className={`text-sm p-2 rounded ${isValid ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                        {t[currentLang].form.problemCount} {problemCount}{t[currentLang].units.questions} 
                        {isValid ? ` ${t[currentLang].form.valid}` : ` ${t[currentLang].form.invalid}`}
                        <br />
                        {t[currentLang].form.limit} {formatDataSize(sizeLimit)} (使用: {((currentSize / sizeLimit) * 100).toFixed(1)}%)
                      </div>
                    );
                  })()}
                </div>
              )}

              <button
                onClick={handleCreateQR}
                disabled={!selectedItem || !authorName.trim() || isGeneratingQR}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all shadow-md hover:shadow-lg ${
                  !selectedItem || !authorName.trim() || isGeneratingQR
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'quiz-action-button transform hover:scale-105'
                }`}
              >
                {isGeneratingQR ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t[currentLang].loading.generatingQR}</span>
                  </div>
                ) : (
                  t[currentLang].buttons.createQR
                )}
              </button>
            </div>

            {generatedQR && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t[currentLang].messages.qrGenerated}
                </h4>
                <div className="text-center">
                  <img
                    src={generatedQR}
                    alt="Generated QR Code"
                    className="mx-auto mb-4 border rounded-lg"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t[currentLang].messages.scanThis}
                  </p>
                  
                  {/* QRコードの内容を表示 */}
                  <div className="mb-4 p-2 bg-white dark:bg-gray-800 border rounded text-xs">
                    <p className="font-medium mb-2">{t[currentLang].messages.qrContent}</p>
                    <button
                      onClick={async () => {
                        try {
                          // QRコードから実際のデータを抽出
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = async () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx?.drawImage(img, 0, 0);
                            
                            try {
                              const QrScanner = (await import('qr-scanner')).default;
                              const result = await QrScanner.scanImage(canvas);
                              console.log('QRコードの内容:', result);
                              alert(`QRコードの内容: ${result.substring(0, 100)}...`);
                            } catch (error) {
                              console.error('QR読み取りエラー:', error);
                              alert('QRコードの読み取りに失敗しました');
                            }
                          };
                          img.src = generatedQR;
                        } catch (error) {
                          console.error('QR解析エラー:', error);
                        }
                      }}
                      className="px-3 py-1 quiz-action-button rounded text-xs"
                    >
                      {t[currentLang].buttons.showContent}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.download = `qr-${shareType}-${Date.now()}.png`;
                      link.href = generatedQR;
                      link.click();
                    }}
                    className="px-4 py-2 quiz-action-button rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    {t[currentLang].buttons.download}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR読み取り・インポートタブ */}
      {currentTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              {t[currentLang].importSection.title}
            </h3>
            <p className="text-green-800 dark:text-green-200 text-sm">
              {t[currentLang].importSection.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <button
                onClick={() => setShowScanner(true)}
                className="w-full py-3 px-4 quiz-action-button rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {t[currentLang].buttons.scanCamera}
              </button>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[currentLang].importSection.fileUploadTitle}
                </label>
                
                {/* ドラッグ＆ドロップエリア */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`mb-4 p-6 border-2 border-dashed rounded-lg text-center transition-colors cursor-pointer ${
                    isDragOver
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => document.getElementById('qr-file-input')?.click()}
                >
                  <div className="space-y-2">
                    <div className="text-4xl">📷</div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {isDragOver ? t[currentLang].importSection.dragDropActive : t[currentLang].importSection.dragDropArea}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t[currentLang].importSection.supportedFormats}
                    </div>
                  </div>
                </div>
                
                <input
                  id="qr-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[currentLang].importSection.manualInput}
                </label>
                <textarea
                  value={manualQRInput}
                  onChange={(e) => setManualQRInput(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder={t[currentLang].importSection.manualPlaceholder}
                />
                <button
                  onClick={handleManualImport}
                  disabled={!manualQRInput.trim()}
                  className={`mt-2 w-full py-2 px-4 rounded-lg font-medium transition-all ${
                    !manualQRInput.trim()
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'quiz-action-button transform hover:scale-105'
                  }`}
                >
                  {t[currentLang].buttons.analyzeData}
                </button>
              </div>
            </div>

            {importedData && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4">
                  {t[currentLang].importSection.previewTitle}
                </h4>
                <div className="space-y-2 text-sm">
                  <p><strong>{t[currentLang].importSection.type}</strong> {importedData.type === 'problem' ? t[currentLang].form.problem : t[currentLang].form.quizSet}</p>
                  <p><strong>{t[currentLang].importSection.author}</strong> {importedData.author}</p>
                  <p><strong>{t[currentLang].importSection.createdDate}</strong> {formatDate(new Date(importedData.timestamp))}</p>
                  {importedData.type === 'problem' ? (
                    <p><strong>{t[currentLang].importSection.question}</strong> {(importedData.data as Problem).question}</p>
                  ) : (
                    <p><strong>{t[currentLang].importSection.quizSetName}</strong> {(importedData.data as QuizSet).name}</p>
                  )}
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleImportData(importedData)}
                    className="flex-1 py-2 px-4 quiz-action-button rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    {t[currentLang].buttons.importExecute}
                  </button>
                  <button
                    onClick={() => setImportedData(null)}
                    className="flex-1 py-2 px-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                  >
                    {t[currentLang].buttons.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 作成したQRタブ */}
      {currentTab === 'myQRs' && (
        <div className="space-y-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
              {t[currentLang].myQRsSection.title}
            </h3>
            <p className="text-purple-800 dark:text-purple-200 text-sm">
              {t[currentLang].myQRsSection.description}
            </p>
          </div>

          {createdQRs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="mb-4">{t[currentLang].myQRsSection.noQRs}</p>
              <button
                onClick={() => setCurrentTab('share')}
                className="px-4 py-2 quiz-action-button rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {t[currentLang].buttons.createQRCode}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {createdQRs.map((qr) => (
                <div key={qr.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm">
                  <div className="text-center mb-4">
                    <img
                      src={qr.qrCode}
                      alt="QR Code"
                      className="w-24 h-24 mx-auto border rounded"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white truncate" title={qr.title}>
                      {qr.title}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t[currentLang].myQRsSection.qrInfo.type} {qr.type === 'problem' ? t[currentLang].form.problem : t[currentLang].form.quizSet}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t[currentLang].myQRsSection.qrInfo.author} {qr.author}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t[currentLang].myQRsSection.qrInfo.createdDate} {formatDate(qr.createdAt)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {t[currentLang].myQRsSection.qrInfo.size} {formatDataSize(qr.dataSize)}
                    </p>
                  </div>
                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.download = `qr-${qr.type}-${qr.id}.png`;
                        link.href = qr.qrCode;
                        link.click();
                      }}
                      className="flex-1 py-2 px-3 quiz-action-button rounded text-xs font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      {t[currentLang].buttons.save}
                    </button>
                    <button
                      onClick={() => deleteCreatedQR(qr.id)}
                      className="flex-1 py-2 px-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/40 rounded text-xs font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105 backdrop-blur-sm"
                    >
                      {t[currentLang].buttons.delete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ファイル共有タブ */}
      {currentTab === 'files' && (
        <div className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
              {t[currentLang].filesSection.title}
            </h3>
            <p className="text-green-800 dark:text-green-200 text-sm mb-3">
              {t[currentLang].filesSection.description}
            </p>
            <div className="bg-white dark:bg-green-800/30 rounded p-3 text-xs">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">{t[currentLang].filesSection.featuresTitle}</h4>
              <ul className="text-green-700 dark:text-green-200 space-y-1">
                <li>• <strong>{t[currentLang].filesSection.features.noLimit}</strong>: {t[currentLang].filesSection.features.noLimitDesc}</li>
                <li>• <strong>{t[currentLang].filesSection.features.fullData}</strong>: {t[currentLang].filesSection.features.fullDataDesc}</li>
                <li>• <strong>{t[currentLang].filesSection.features.jsonFormat}</strong>: {t[currentLang].filesSection.features.jsonFormatDesc}</li>
                <li>• <strong>{t[currentLang].filesSection.features.easyShare}</strong>: {t[currentLang].filesSection.features.easyShareDesc}</li>
              </ul>
              
              <div className="mt-3 p-2 bg-green-100 dark:bg-green-800/50 rounded">
                <h5 className="font-semibold text-green-900 dark:text-green-100 mb-1">{t[currentLang].filesSection.sizeComparison}</h5>
                <div className="text-green-800 dark:text-green-200 space-y-1">
                  <div>• {t[currentLang].filesSection.formats.qrCode}</div>
                  <div>• {t[currentLang].filesSection.formats.file100}</div>
                  <div>• {t[currentLang].filesSection.formats.file1000}</div>
                  <div>• {t[currentLang].filesSection.formats.file5000}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ファイル作成 */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t[currentLang].filesSection.createDownloadTitle}
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[currentLang].form.shareType}
                </label>
                <div className="space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="problem"
                      checked={shareType === 'problem'}
                      onChange={(e) => setShareType(e.target.value as 'problem' | 'quizSet')}
                      className="form-radio text-green-600"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{t[currentLang].form.problem}</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="quizSet"
                      checked={shareType === 'quizSet'}
                      onChange={(e) => setShareType(e.target.value as 'problem' | 'quizSet')}
                      className="form-radio text-green-600"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">{t[currentLang].form.quizSet}</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {shareType === 'problem' ? t[currentLang].form.selectProblem : t[currentLang].form.selectQuizSet}
                </label>
                <select
                  value={selectedItem || ''}
                  onChange={(e) => setSelectedItem(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t[currentLang].form.selectOption}</option>
                  {availableItems.map((item: any) => (
                    <option key={item.id} value={item.id}>
                      {shareType === 'problem' ? item.question : item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t[currentLang].form.authorName}
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder={t[currentLang].form.authorPlaceholder}
                />
              </div>

              {selectedItem && shareType === 'quizSet' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">{t[currentLang].filesSection.shareOptions}</h5>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const selectedQuizSet = availableItems.find((item: any) => item.id === selectedItem);
                        if (selectedQuizSet) downloadAsFile(selectedQuizSet, 'quizSet', true);
                      }}
                      disabled={!selectedItem || !authorName.trim()}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                        !selectedItem || !authorName.trim()
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'quiz-action-button transform hover:scale-105'
                      }`}
                    >
                      {t[currentLang].buttons.downloadFull}
                    </button>
                    <button
                      onClick={() => {
                        const selectedQuizSet = availableItems.find((item: any) => item.id === selectedItem);
                        if (selectedQuizSet) downloadAsFile(selectedQuizSet, 'quizSet', false);
                      }}
                      disabled={!selectedItem || !authorName.trim()}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-all ${
                        !selectedItem || !authorName.trim()
                          ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : 'quiz-action-button transform hover:scale-105'
                      }`}
                    >
                      {t[currentLang].buttons.downloadLight}
                    </button>
                  </div>
                </div>
              )}

              {selectedItem && shareType === 'problem' && (
                <button
                  onClick={() => {
                    const selectedProblem = availableItems.find((item: any) => item.id === selectedItem);
                    if (selectedProblem) downloadAsFile(selectedProblem, 'problem', true);
                  }}
                  disabled={!selectedItem || !authorName.trim()}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-all shadow-md hover:shadow-lg ${
                    !selectedItem || !authorName.trim()
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'quiz-action-button transform hover:scale-105'
                  }`}
                >
                  {t[currentLang].buttons.downloadProblemFile}
                </button>
              )}
            </div>

            {/* ファイル読み込み */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t[currentLang].filesSection.importTitle}
              </h4>
              
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <div className="space-y-4">
                  <div className="text-4xl">📄</div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t[currentLang].filesSection.selectFile}
                    </h5>
                    <input
                      type="file"
                      accept=".minguella,.json"
                      onChange={handleFileImport}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900 dark:file:text-green-200"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t[currentLang].filesSection.supportedFiles}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h5 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">{t[currentLang].filesSection.importNotice}</h5>
                <ul className="text-yellow-800 dark:text-yellow-200 text-xs space-y-1">
                  <li>• <strong>{t[currentLang].filesSection.importNotes.fullVersion}</strong>: {t[currentLang].filesSection.importNotes.fullVersionDesc}</li>
                  <li>• <strong>{t[currentLang].filesSection.importNotes.lightVersion}</strong>: {t[currentLang].filesSection.importNotes.lightVersionDesc}</li>
                  <li>• <strong>{t[currentLang].filesSection.importNotes.duplicate}</strong>: {t[currentLang].filesSection.importNotes.duplicateDesc}</li>
                  <li>• <strong>{t[currentLang].filesSection.importNotes.backup}</strong>: {t[currentLang].filesSection.importNotes.backupDesc}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QRスキャナーモーダル */}
      {showScanner && (
        <QRScanner
          onScan={handleScanSuccess}
          onError={(error: string) => alert(error)}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}