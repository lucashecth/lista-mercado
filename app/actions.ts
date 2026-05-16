"use server";

import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { revalidatePath } from 'next/cache';

const formatarChave = (chave?: string) => {
  if (!chave) return '';
  return chave.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
};

const jwt = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: formatarChave(process.env.GOOGLE_PRIVATE_KEY),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function conectar() {
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, jwt);
  await doc.loadInfo();
  return doc;
}

// --- FUNÇÕES DA LISTA BASE ---

export async function buscarListaBase() {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  
  const itens = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nome = row.get('Item');
    
    // Ignora linhas totalmente em branco no fim da planilha
    if (!nome) continue;
    
    let id = row.get('Id');
    let ordem = row.get('Ordem');
    
    // NOVIDADE 1: Se você adicionou o item direto na planilha e deixou ID ou Ordem vazios,
    // o app percebe, cria as informações corretas e salva de volta na planilha automaticamente.
    if (!id || !ordem) {
      if (!id) {
        id = `planilha_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        row.set('Id', id);
      }
      if (!ordem) {
        ordem = (i + 1).toString();
        row.set('Ordem', ordem);
      }
      await row.save();
    }
    
    itens.push({
      id: id,
      nome: nome,
      ordem: Number(ordem) || 0
    });
  }
  
  return itens.sort((a, b) => a.ordem - b.ordem);
}

export async function adicionarItemBase(nome: string) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  
  // Limpa possíveis linhas em branco antes de calcular a nova ordem
  const linhasValidas = rows.filter(r => r.get('Item'));
  
  await sheet.addRow({ 
    Id: Date.now().toString(), 
    Item: nome, 
    Ordem: (linhasValidas.length + 1).toString() 
  });
  revalidatePath('/lista');
}

export async function removerItemBase(id: string) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get('Id') === id);
  if (row) await row.delete();
  revalidatePath('/lista');
}

export async function reordenarItensBase(itensAtualizados: { id: string, ordem: number }[]) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle['lista'];
  const rows = await sheet.getRows();
  for (const item of itensAtualizados) {
    const row = rows.find(r => r.get('Id') === item.id);
    if (row) {
      row.set('Ordem', item.ordem.toString());
      await row.save();
    }
  }
  revalidatePath('/lista');
}

// --- FUNÇÕES DO MERCADO (SINCRONIZAÇÃO INCREMENTAL) ---

export async function iniciarMercadoAction() {
  const doc = await conectar();
  
  // Puxa a lista base já corrigindo e gerando IDs automáticos se necessário
  const itensBase = await buscarListaBase();
  
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const agora = new Date();
  const nomeAba = `${meses[agora.getMonth()]}${agora.getFullYear().toString().slice(-2)}`;

  let mercadoSheet = doc.sheetsByTitle[nomeAba];
  
  // Cenário A: Primeira vez abrindo o mercado no mês. Cria a aba e joga tudo lá.
  if (!mercadoSheet) {
    mercadoSheet = await doc.addSheet({ 
      title: nomeAba, 
      headerValues: ['Id', 'Item', 'Comprado', 'Preco', 'Qtd', 'Total', 'Mercado', 'Finalizado'] 
    });
    
    const novosDados = itensBase.map(i => ({
      Id: i.id,
      Item: i.nome,
      Comprado: 'NÃO',
      Preco: '0',
      Qtd: '0',
      Total: '0',
      Mercado: '',
      Finalizado: 'NÃO'
    }));
    
    if (novosDados.length > 0) {
      await mercadoSheet.addRows(novosDados);
    }
  } else {
    // NOVIDADE 2: A aba do mês já existe, mas você adicionou produtos novos na base (pelo app ou planilha).
    // O código compara o que já está na aba do mês com a lista base e adiciona apenas os novos de forma incremental!
    const rowsMercado = await mercadoSheet.getRows();
    const idsExistentesNoMercado = new Set(rowsMercado.map(r => r.get('Id')));
    
    const itensNovosFaltando = itensBase.filter(i => !idsExistentesNoMercado.has(i.id));
    
    if (itensNovosFaltando.length > 0) {
      const novosDados = itensNovosFaltando.map(i => ({
        Id: i.id,
        Item: i.nome,
        Comprado: 'NÃO',
        Preco: '0',
        Qtd: '0',
        Total: '0',
        Mercado: rowsMercado[0]?.get('Mercado') || '',
        Finalizado: rowsMercado[0]?.get('Finalizado') || 'NÃO'
      }));
      await mercadoSheet.addRows(novosDados);
    }
  }

  // Busca as linhas prontas e atualizadas para renderizar na tela do celular
  const rows = await mercadoSheet.getRows();
  return {
    nomeAba,
    mercadoNome: rows[0]?.get('Mercado') || '',
    finalizado: rows[0]?.get('Finalizado') === 'SIM',
    itens: rows.map(r => ({
      id: r.get('Id'),
      nome: r.get('Item'),
      comprado: r.get('Comprado') === 'SIM',
      preco: Number(r.get('Preco')) || 0,
      qtd: r.get('Qtd') || '0',
      total: Number(r.get('Total')?.toString().replace(',', '.')) || 0
    }))
  };
}

export async function atualizarCompraAction(aba: string, id: string, dados: any) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle[aba];
  const rows = await sheet.getRows();
  const row = rows.find(r => r.get('Id') === id);
  
  if (row) {
    row.set('Comprado', dados.comprado ? 'SIM' : 'NÃO');
    row.set('Preco', dados.preco || 0);
    row.set('Qtd', dados.qtd || 0);
    row.set('Total', dados.total !== undefined ? dados.total : 0);
    if (dados.mercadoNome !== undefined) row.set('Mercado', dados.mercadoNome);
    await row.save();
  }
}

export async function finalizarCompraAction(aba: string, mercadoNome: string) {
  const doc = await conectar();
  const sheet = doc.sheetsByTitle[aba];
  const rows = await sheet.getRows();
  
  for (const row of rows) {
    row.set('Finalizado', 'SIM');
    row.set('Mercado', mercadoNome);
    await row.save();
  }
}