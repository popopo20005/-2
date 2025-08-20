import QRCode from 'qrcode';
import * as LZString from 'lz-string';
import type { Problem, QuizSet } from '../types';

export interface ShareData {
  version: string;
  type: 'problem' | 'quizSet';
  timestamp: number;
  author: string;
  data: Problem | QuizSet;
}

export const qrShareService = {
  // QRコードを生成
  async generateQRCode(
    data: Problem | QuizSet, 
    type: 'problem' | 'quizSet',
    author: string = 'Anonymous'
  ): Promise<string> {
    try {
      console.log('QRコード生成開始:', { type, author, data });
      
      const shareData: ShareData = {
        version: '1.0.0',
        type,
        timestamp: Date.now(),
        author,
        data
      };

      console.log('共有データ作成:', shareData);

      // データを圧縮
      const jsonString = JSON.stringify(shareData);
      console.log('JSONサイズ:', jsonString.length);
      console.log('JSON内容:', jsonString);
      
      const compressed = LZString.compressToBase64(jsonString);
      console.log('圧縮後サイズ:', compressed.length);
      console.log('圧縮データ:', compressed);
      
      if (!compressed) {
        throw new Error('データの圧縮に失敗しました');
      }
      
      // QRコードを生成
      console.log('QRコード生成中...');
      const qrCodeDataURL = await QRCode.toDataURL(compressed, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      console.log('QRコード生成成功');
      return qrCodeDataURL;
    } catch (error) {
      console.error('QRコード生成エラー:', error);
      if (error instanceof Error) {
        throw new Error(`QRコードの生成に失敗しました: ${error.message}`);
      } else {
        throw new Error('QRコードの生成に失敗しました');
      }
    }
  },

  // QRコードからデータを復元
  parseQRData(qrData: string): ShareData {
    try {
      console.log('QRデータ解析開始:', qrData.substring(0, 50) + '...');
      console.log('QRデータ長:', qrData.length);
      
      // Base64から展開
      console.log('LZString展開試行中...');
      const decompressed = LZString.decompressFromBase64(qrData);
      console.log('展開結果:', decompressed);
      
      if (!decompressed) {
        throw new Error('データの展開に失敗しました');
      }

      const shareData: ShareData = JSON.parse(decompressed);
      
      // バージョンチェック
      if (!shareData.version || !shareData.type || !shareData.data) {
        throw new Error('無効なデータ形式です');
      }

      // データの基本検証
      if (shareData.type === 'problem') {
        const problem = shareData.data as Problem;
        if (!problem.question || !problem.category || !problem.explanation) {
          throw new Error('問題データが不完全です');
        }
      } else if (shareData.type === 'quizSet') {
        const quizSet = shareData.data as QuizSet;
        if (!quizSet.name || !Array.isArray(quizSet.problemIds)) {
          throw new Error('問題集データが不完全です');
        }
      }

      return shareData;
    } catch (error: any) {
      console.error('QRデータ解析エラー:', error);
      throw new Error('QRコードの読み取りに失敗しました: ' + (error?.message || '不明なエラー'));
    }
  },

  // データサイズを計算（QRコードの制限チェック用）
  calculateDataSize(data: Problem | QuizSet, type: 'problem' | 'quizSet'): number {
    const shareData: ShareData = {
      version: '1.0.0',
      type,
      timestamp: Date.now(),
      author: 'Test',
      data
    };
    
    const jsonString = JSON.stringify(shareData);
    const compressed = LZString.compressToBase64(jsonString);
    return compressed.length;
  },

  // データサイズが制限内かチェック
  isDataSizeValid(data: Problem | QuizSet, type: 'problem' | 'quizSet'): boolean {
    const size = this.calculateDataSize(data, type);
    // QRコードの実用的な制限（約2KB）
    return size <= 2048;
  },

  // 共有用URLを生成（将来の拡張用）
  generateShareURL(qrData: string): string {
    const baseURL = window.location.origin;
    const encodedData = encodeURIComponent(qrData);
    return `${baseURL}/#/import?data=${encodedData}`;
  }
};