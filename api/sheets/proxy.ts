export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    let webAppUrl = '';
    let payload: any = null;

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      webAppUrl = body?.webAppUrl;
      payload = body?.payload;
    } else if (req.method === 'GET') {
      webAppUrl = (req.query?.webAppUrl || '') as string;
    }

    if (!webAppUrl) {
      return res.status(400).json({ status: 'error', message: 'Chưa cấu hình Google Apps Script Web App URL.' });
    }

    if (webAppUrl.includes('/macros/library/') || webAppUrl.includes('/edit')) {
      return res.status(400).json({
        status: 'error',
        message: 'URL không đúng định dạng Web App! Vui lòng bấm "Triển khai (Deploy)" -> "Ứng dụng Web" trong Apps Script và copy link dạng https://script.google.com/macros/s/.../exec'
      });
    }

    if (req.method === 'POST') {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().startsWith('<') || text.toLowerCase().includes('the page cannot')) {
        return res.status(400).json({
          status: 'error',
          message: 'Google Apps Script trả về trang HTML thay vì JSON. Vui lòng kiểm tra lại URL Web App (phải đuôi /exec) và cài đặt "Người có quyền truy cập: Bất kỳ ai (Anyone)".'
        });
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(500).json({ status: 'error', message: 'Dữ liệu từ Google Apps Script không phải JSON hợp lệ.' });
      }
      return res.json(data);
    } else {
      const targetUrl = new URL(webAppUrl);
      targetUrl.searchParams.append('action', 'getAll');

      const response = await fetch(targetUrl.toString());
      const text = await response.text();

      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().startsWith('<') || text.toLowerCase().includes('the page cannot')) {
        return res.status(400).json({
          status: 'error',
          message: 'Google Apps Script trả về trang HTML. Vui lòng kiểm tra cài đặt "Người có quyền truy cập: Bất kỳ ai (Anyone)".'
        });
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(500).json({ status: 'error', message: 'Dữ liệu từ Google Apps Script không phải JSON hợp lệ.' });
      }
      return res.json(data);
    }
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: 'Lỗi kết nối proxy: ' + (err.message || 'Error') });
  }
}
