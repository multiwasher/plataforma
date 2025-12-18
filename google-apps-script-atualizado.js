const SPREADSHEET_ID = '1p0rtsofyxvuRxpBsQZaLOs5YFB0qeUUJigZhVYlSvDc'; // ID da sua folha Somengil

// NOVO: Ordem das colunas na Google Sheet (Com "Serial Number" em vez de "Serial")
const COLUMN_HEADERS = [
    "Timestamp", "Serial Number", 
    "Nome do Técnico", "Email do Técnico", "Telefone do Técnico", 
    "Nome do Cliente", "Nº Contribuinte (NIF)", "Email do Cliente", "Morada", 
    "Código Postal", "Cidade", "País", "Representante do Cliente", "Telefone do Cliente", 
    "Modelo", "Voltagem", "Frequência", "Aquecimento", 
    "Estado de Entrega", "Tipo de Instalação", "Responsabilidade Gradil", 
    "Pode receber um camião TIR?", "Tem empilhador (2.5Ton)?", 
    "Capacidade descarregar sem Técnico Somengil?", "Tem técnico para auxiliar na instalação?", 
    "Pode armazenar equipamento?", "É necessário cintas?", "Tem água na sala?", 
    "Tamanho adaptador água", "Tem energia eléctrica?", "Tem escadas?", 
    "Tem ficha eléctrica?", "Opção dos Amperes", "Tem detergentes?", 
    "Documentação p/ entrar na Fábrica?", "Equipamento Proteção Obrigatório?", 
    "Chão acabado?", "Dreno preparado?", "Ventilação preparada?", 
    "Utensílios sujos para testes?",
    "Operador presente na formação?", "Nome do Operador", 
    "Responsável Comissionamento presente?", "Nome do Responsável Comissionamento", 
    "Ligações Pressão Água (2bar rec.)", "Marca Produtos Químicos", 
    "Medição Porta (Largura - cm)", "Medição Porta (Altura - cm)", "Medição Chão ao Teto (cm)", 
    "Horário Trabalho (Início)", "Horário Trabalho (Fim)", "Data Entrega Prevista", 
    "Observações Gerais"
];

// Mapeamento dos campos do formulário (chaves camelCase) para os cabeçalhos do Sheets (Full Text)
// CRUCIAL: Este mapa garante que os dados do front-end vão para a coluna certa.
const FORM_TO_SHEET_MAP = {
    // Escrita usa as chaves do objeto 'data' do payload JSON
    "tecnicoNome": "Nome do Técnico", "tecnicoEmail": "Email do Técnico", "tecnicoTelefone": "Telefone do Técnico",
    "clienteNome": "Nome do Cliente", "clienteNIF": "Nº Contribuinte (NIF)", "clienteEmail": "Email do Cliente",
    "clienteMorada": "Morada", "clienteCodigoPostal": "Código Postal", "clienteCidade": "Cidade",
    "clientePais": "País", "clienteRepresentante": "Representante do Cliente", "clienteTelefone": "Telefone do Cliente",
    
    "equipamentoModelo": "Modelo", "equipamentoVoltagem": "Voltagem", "equipamentoFrequencia": "Frequência",
    "equipamentoAquecimento": "Aquecimento", "condicaoMontagem": "Estado de Entrega", 
    "instalacaoTipo": "Tipo de Instalação", "responsabilidadeGradil": "Responsabilidade Gradil",
    
    "podeReceberTIR": "Pode receber um camião TIR?", "temEmpilhador": "Tem empilhador (2.5Ton)?", 
    "podeDescarregarSemTecnico": "Capacidade descarregar sem Técnico Somengil?", 
    "temTecnicoAuxiliar": "Tem técnico para auxiliar na instalação?", 
    "podeArmazenar": "Pode armazenar equipamento?", "necessarioCintas": "É necessário cintas?", 
    "temAguaSala": "Tem água na sala?", "adaptadorAguaTamanho": "Tamanho adaptador água",
    "temEnergiaEletrica": "Tem energia eléctrica?", "temEscadas": "Tem escadas?", 
    "temFichaEletrica": "Tem ficha eléctrica?", "amperesOpcao": "Opção dos Amperes", 
    "temDetergentes": "Tem detergentes?", "documentacaoFabrica": "Documentação p/ entrar na Fábrica?", 
    "equipamentoProtecao": "Equipamento Proteção Obrigatório?", "chaoAcabado": "Chão acabado?", 
    "drenoPreparado": "Dreno preparado?", "ventilacaoPreparada": "Ventilação preparada?", 
    "temUtensiliosSujos": "Utensílios sujos para testes?",

    "operadorPresente": "Operador presente na formação?", "operadorNome": "Nome do Operador", 
    "responsavelComissionamentoPresente": "Responsável Comissionamento presente?", 
    "responsavelComissionamentoNome": "Nome do Responsável Comissionamento", 
    
    "ligacoesPressaoAgua": "Ligações Pressão Água (2bar rec.)", 
    "marcaProdutosQuimicos": "Marca Produtos Químicos", 
    "medicaoPortaLargura": "Medição Porta (Largura - cm)", "medicaoPortaAltura": "Medição Porta (Altura - cm)", 
    "medicaoChaoTecto": "Medição Chão ao Teto (cm)", 
    "horarioTrabalhoInicio": "Horário Trabalho (Início)", "horarioTrabalhoFim": "Horário Trabalho (Fim)", 
    "dataEntregaPrevista": "Data Entrega Prevista", "observacoes": "Observações Gerais"
};

// Mapeamento inverso para Leitura (Sheets Header -> HTML Key)
const SHEET_TO_FORM_MAP = {};
for (const key in FORM_TO_SHEET_MAP) {
    SHEET_TO_FORM_MAP[FORM_TO_SHEET_MAP[key]] = key;
}


/**
 * Função principal para processar requisições POST da aplicação web (escrita, leitura e envio de email).
 * @param {object} request O objeto de requisição POST.
 */
function doPost(request) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  // CRITICAL SAFETY CHECK against manual/malformed execution
  if (!request) {
      Logger.log("Erro: Objeto de requisição (request) não fornecido.");
      return output.setContent(JSON.stringify({ 
          result: "error", 
          message: "Erro interno: A requisição não pôde ser processada (Objeto 'request' ausente)." 
      }));
  }

  // 1. Inicializa com URL-encoded parameters (default para 'fetch')
  let payload = request.parameter; 
  let action = payload.action;
  let serialNumber = payload.serialNumber;

  // 2. Tenta SOBRESCREVER com o payload JSON (modo de ESCRITA da app HTML)
  if (request.postData && request.postData.contents) {
    try {
        const jsonPayload = JSON.parse(request.postData.contents);
        // Atualiza payload, action e serialNumber se forem válidos
        if (jsonPayload) {
            payload = jsonPayload;
            serialNumber = jsonPayload.serial || serialNumber;
            action = jsonPayload.action || 'write'; // Se JSON, assume 'write' se não especificado
        }
    } catch(e) {
        Logger.log("Aviso: Falha na análise JSON. Usando URL parameters como fallback. Erro: " + e.toString());
        // Se a análise JSON falhar, continua a usar request.parameter
    }
  }
  
  // 3. Execução final
  try {
    // --- 1. MODO DE LEITURA (FETCH) ---
    if (action === 'fetch') {
      if (!serialNumber) {
        throw new Error("O Número de Série (serial/serialNumber) é obrigatório para a ação 'fetch'.");
      }
      return handleFetchData(serialNumber);
    } 
    
    // --- 2. MODO DE ESCRITA (WRITE) ---
    else if (action === 'write' && payload.data) {
        if (!serialNumber) {
          throw new Error("O Número de Série (serial/serialNumber) é obrigatório para a ação 'write'.");
        }
        return handleWriteData(serialNumber, payload);
    }
    
    // --- 3. NOVO: MODO DE ENVIO DE EMAIL (SEND EMAIL) ---
    else if (action === 'sendEmail') {
        return handleSendEmail(payload);
    }
    
    // Caso a ação não seja reconhecida ou esteja faltando
    return output.setContent(JSON.stringify({ 
      result: "error", 
      message: "Ação de Apps Script inválida ou faltante. Use 'fetch', 'write' ou 'sendEmail'." 
    }));

  } catch (e) {
    Logger.log("Erro na função doPost: " + e.toString());
    return output.setContent(JSON.stringify({ 
      result: "error", 
      message: "Erro interno no servidor: " + e.toString() 
    }));
  }
}

/**
 * Função auxiliar para tratar a ESCRITA (substituição da Linha 2).
 * Inclui log de debugging para verificar a array de valores antes da escrita.
 * @param {string} serialNumber O nome do separador alvo.
 * @param {object} payload O objeto JSON contendo 'serial', 'timestamp' e 'data' (campos do formulário).
 * @returns {object} Um objeto ContentService com o resultado JSON.
 */
function handleWriteData(serialNumber, payload) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(serialNumber);

    // Cria o separador se não existir
    if (!sheet) {
        sheet = ss.insertSheet(serialNumber);
        sheet.appendRow(COLUMN_HEADERS); // Insere os cabeçalhos
        // ATENÇÃO: Se esta for a primeira execução, garanta que a Linha 1 do separador TEM APENAS os cabeçalhos definidos em COLUMN_HEADERS, sem concatenação.
    }

    const checklistData = payload.data;
    const timestamp = payload.timestamp || new Date().toISOString();
    
    // Cria a linha de valores a ser inserida (baseada na ordem de COLUMN_HEADERS)
    const rowValues = COLUMN_HEADERS.map(header => {
        if (header === "Timestamp") return timestamp;
        
        // Mapeamento especial para 'Serial Number' no Apps Script
        if (header === "Serial Number") return serialNumber; 
        
        // Mapear o cabeçalho completo para a chave camelCase
        const formKey = SHEET_TO_FORM_MAP[header];
        
        // Usar o valor do formulário ou string vazia se ausente/nulo
        let value = (formKey && checklistData.hasOwnProperty(formKey)) ? checklistData[formKey] : '';
        
        if (value === null || value === undefined) return ''; 
        
        // Converte booleanos (Sim/Não) e números para tipos corretos se necessário, ou mantém string.
        return value; 
    });
    
    // --- LOGS DE DEBUGGING ADICIONADOS ---
    Logger.log('----------------------------------------------------');
    Logger.log(`Escrita para Serial: ${serialNumber}`);
    Logger.log('Dados do payload (checklistData): ' + JSON.stringify(checklistData));
    Logger.log('Array de Valores a ser escrita (rowValues): ' + JSON.stringify(rowValues));
    Logger.log('Número de colunas (Esperado): ' + COLUMN_HEADERS.length);
    Logger.log('Número de valores (Gerado): ' + rowValues.length);
    Logger.log('----------------------------------------------------');
    // --- FIM DOS LOGS DE DEBUGGING ---

    // A Linha 1 é dos cabeçalhos, a Linha 2 é onde os dados serão escritos/substituídos.
    
    try {
        // Substituir a linha 2 (ignora a linha de cabeçalho)
        sheet.getRange(2, 1, 1, rowValues.length).setValues([rowValues]);
    } catch (e) {
        // Se a Linha 2 não existe ou a folha estava vazia (getLastRow < 2), tenta adicionar a primeira linha de dados.
        if (sheet.getLastRow() < 2) {
             sheet.appendRow(rowValues);
        } else {
             // Caso a Linha 2 exista mas o setValues falhou por outro motivo (ex: Range size mismatch)
             Logger.log("Erro ao escrever Linha 2 existente: " + e.toString());
             throw new Error("Falha ao escrever na Linha 2. Verifique se o número de colunas do Sheet corresponde ao App Script.");
        }
    }


    return ContentService.createTextOutput(JSON.stringify({ 
        result: "success", 
        message: `Dados salvos no separador: ${serialNumber}` 
    })).setMimeType(ContentService.MimeType.JSON);
}


/**
 * Função auxiliar para tratar a LEITURA (fetch) de dados.
 * @param {string} serialNumber O nome do separador alvo.
 * @returns {object} Um objeto ContentService com o resultado JSON.
 */
function handleFetchData(serialNumber) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(serialNumber); 

    if (!sheet || sheet.getLastRow() < 2) {
        return ContentService.createTextOutput(JSON.stringify({ 
            result: "not_found", 
            message: `Nenhum separador encontrado ou o separador '${serialNumber}' está vazio.` 
        })).setMimeType(ContentService.MimeType.JSON);
    }

    // Assumimos que a linha 1 contém os cabeçalhos (COLUMN_HEADERS)
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    // A linha 2 contém os dados mais recentes
    const dataRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const finalData = {};
    
    // Itera sobre os dados e mapeia para chaves camelCase
    for (let i = 0; i < headers.length; i++) {
        const sheetHeader = headers[i];
        let value = dataRow[i];
        
        // Obtém a chave camelCase usando o mapeamento SHEET_TO_FORM_MAP
        const formKey = SHEET_TO_FORM_MAP[sheetHeader] || sheetHeader; // Usa o header se não mapeado
        
        // Converte valores Date para string vazio (evita problemas com campos de texto como "1/2" que o Sheets interpreta como data)
        if (value instanceof Date) {
            // Para campos que deveriam ser datas reais (dataEntregaPrevista), mantemos a data formatada
            if (formKey === 'dataEntregaPrevista') {
                value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            } else {
                // Para outros campos que foram interpretados como data mas são texto, ignoramos
                value = "";
            }
        }
        
        finalData[formKey] = value === "" ? null : value; // Devolve nulo se a célula estiver vazia
    }
    
    // Adicionar o serial number
    finalData.serial = serialNumber;

    return ContentService.createTextOutput(JSON.stringify({ 
        result: "success", 
        data: finalData 
    })).setMimeType(ContentService.MimeType.JSON);
}


/**
 * NOVA FUNÇÃO: Enviar email com imagens anexadas.
 * @param {object} payload O objeto JSON contendo 'serial', 'to', 'subject' e 'images' (array de objetos com name, data, mimeType).
 * @returns {object} Um objeto ContentService com o resultado JSON.
 */
function handleSendEmail(payload) {
    try {
        const { serial, to, subject, images } = payload;
        
        // Validações
        if (!to) {
            throw new Error("O destinatário (to) é obrigatório para enviar email.");
        }
        
        if (!images || images.length === 0) {
            throw new Error("Nenhuma imagem fornecida para envio.");
        }
        
        if (!serial) {
            throw new Error("O número de série (serial) é obrigatório para identificar o equipamento.");
        }

        // Construir corpo do email em HTML
        const emailBody = `
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #0066cc;">Fotos de Instalação - Equipamento ${serial}</h2>
                    <p>Este email contém <strong>${images.length}</strong> foto(s) de comprovação da instalação do equipamento.</p>
                    <hr style="border: 1px solid #ddd;">
                    <p style="font-size: 12px; color: #666;">
                        <strong>Número de Série:</strong> ${serial}<br>
                        <strong>Data de Envio:</strong> ${new Date().toLocaleString('pt-PT')}<br>
                        <strong>Origem:</strong> Plataforma Multi Washer Checklist
                    </p>
                    <p style="font-size: 11px; color: #999; margin-top: 20px;">
                        Este é um email automático. Por favor, não responda diretamente.
                    </p>
                </body>
            </html>
        `;

        // Converter imagens base64 para blobs
        const attachments = images.map(img => {
            const blob = Utilities.newBlob(
                Utilities.base64Decode(img.data), 
                img.mimeType, 
                img.name
            );
            return blob;
        });

        // Enviar email com anexos
        GmailApp.sendEmail(to, subject || `Fotos Instalação - Equipamento ${serial}`, '', {
            htmlBody: emailBody,
            attachments: attachments,
            name: 'Plataforma Multi Washer'
        });

        Logger.log(`Email enviado com sucesso para ${to} com ${images.length} anexo(s). Serial: ${serial}`);

        return ContentService.createTextOutput(JSON.stringify({ 
            result: "success", 
            message: `Email enviado com sucesso para ${to} com ${images.length} foto(s).` 
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        Logger.log("Erro ao enviar email: " + e.toString());
        return ContentService.createTextOutput(JSON.stringify({ 
            result: "error", 
            message: "Erro ao enviar email: " + e.toString() 
        })).setMimeType(ContentService.MimeType.JSON);
    }
}


// Função de teste/saudação (opcional, para requisições GET)
function doGet(request) {
    return ContentService.createTextOutput("Endpoint Google Apps Script ativo. Use POST para Leitura ('fetch'), Escrita ('write') ou Envio de Email ('sendEmail').").setMimeType(ContentService.MimeType.TEXT);
}
