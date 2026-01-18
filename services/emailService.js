const { Resend } = require('resend');

// Inicializar Resend apenas se a chave estiver configurada
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Resend Email configurado');
} else {
  console.log('⚠️ RESEND_API_KEY não configurada - Emails desabilitados em desenvolvimento');
}

// Email 1: Confirmação de Agendamento
const sendBookingConfirmation = async (clientEmail, clientName, serviceName, date, time, ongName) => {
  if (!resend) {
    console.log('⚠️ Email desabilitado - RESEND_API_KEY não configurada');
    return;
  }

  try {
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    await resend.emails.send({
      from: 'Impulso Jovem <noreply@impulsojovem.com.br>',
      to: [clientEmail],
      subject: '✅ Agendamento Confirmado - Impulso Jovem',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .highlight { color: #667eea; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Agendamento Confirmado!</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${clientName}</strong>!</p>
              
              <p>Seu agendamento foi realizado com sucesso! 🎉</p>
              
              <div class="card">
                <h2 style="color: #667eea; margin-top: 0;">📋 Detalhes do Agendamento</h2>
                <p><strong>Serviço:</strong> ${serviceName}</p>
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Horário:</strong> ${time}</p>
                <p><strong>ONG:</strong> ${ongName}</p>
              </div>
              
              <div class="card" style="background: #E3F2FD; border-left: 4px solid #2196F3;">
                <p style="margin: 0;"><strong>📌 Próximos Passos:</strong></p>
                <ul style="margin: 10px 0;">
                  <li>Aguarde a confirmação de um jovem da ONG</li>
                  <li>Você receberá um e-mail quando o jovem aceitar</li>
                  <li>O jovem entrará em contato no horário agendado</li>
                </ul>
              </div>
              
              <div class="card" style="background: #FFF3E0; border-left: 4px solid #FF9800;">
                <p style="margin: 0;"><strong>⚠️ Lembre-se:</strong> Você é responsável por fornecer todos os materiais necessários. O jovem fornecerá apenas a mão de obra.</p>
              </div>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://www.impulsojovem.com.br/cliente/agendamentos" class="button">Ver Meus Agendamentos</a>
              </p>
            </div>
            <div class="footer">
              <p><strong>Impulso Jovem</strong> - Conectando pessoas e transformando vidas</p>
              <p>Ajudando jovens a conquistarem seu espaço no mercado de trabalho 💙</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('✅ Email de confirmação enviado para:', clientEmail);
  } catch (error) {
    console.error('❌ Erro ao enviar email de confirmação:', error);
  }
};

// Email 2: Jovem Aceitou o Agendamento
const sendJovemAcceptedNotification = async (clientEmail, clientName, serviceName, jovemName, date, time, checkInPin) => {
  if (!resend) {
    console.log('⚠️ Email desabilitado - RESEND_API_KEY não configurada');
    return;
  }

  try {
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    await resend.emails.send({
      from: 'Impulso Jovem <noreply@impulsojovem.com.br>',
      to: [clientEmail],
      subject: '🎉 Jovem Confirmou Seu Agendamento - Impulso Jovem',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .pin-box { background: #E3F2FD; padding: 20px; border-radius: 8px; text-align: center; border: 3px dashed #2196F3; margin: 20px 0; }
            .pin { font-size: 48px; font-weight: bold; color: #2196F3; letter-spacing: 8px; font-family: monospace; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Jovem Confirmou!</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${clientName}</strong>!</p>
              
              <p>Ótimas notícias! Um jovem aceitou seu agendamento! 🎊</p>
              
              <div class="card">
                <h2 style="color: #4CAF50; margin-top: 0;">👨‍🎓 Informações do Atendimento</h2>
                <p><strong>Serviço:</strong> ${serviceName}</p>
                <p><strong>Jovem:</strong> ${jovemName}</p>
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Horário:</strong> ${time}</p>
              </div>
              
              <div class="card" style="background: #E3F2FD; border-left: 4px solid #2196F3;">
                <p style="margin: 0 0 10px 0;"><strong>🔐 Segurança e Validação do Serviço</strong></p>
                <p style="margin: 10px 0; line-height: 1.8;">
                  Para sua segurança, quando o jovem chegar, <strong>peça o PIN de 4 dígitos</strong> que ele possui. 
                  Em seguida, <strong>informe o PIN no aplicativo</strong> para validar o check-in e iniciar o serviço.
                </p>
                <p style="margin: 10px 0; font-size: 14px; color: #1565C0;">
                  ⚠️ Importante: O serviço só pode ser iniciado após a validação do PIN no app.
                </p>
              </div>
              
              <div class="card" style="background: #FFF3E0; border-left: 4px solid #FF9800;">
                <p style="margin: 0 0 10px 0;"><strong>💰 Pagamento ao Jovem</strong></p>
                <p style="margin: 0;">
                  O valor do serviço será repassado ao jovem <strong>somente após você avaliar e finalizar o serviço</strong> 
                  na plataforma. Isso garante que você esteja satisfeito com o trabalho realizado.
                </p>
              </div>
              
              <div class="card" style="background: #E8F5E9; border-left: 4px solid #4CAF50;">
                <p style="margin: 0;"><strong>📋 Passo a Passo:</strong></p>
                <ol style="margin: 10px 0;">
                  <li>O jovem chegará no horário agendado</li>
                  <li>Pergunte o PIN de check-in ao jovem</li>
                  <li>Valide o PIN no aplicativo para iniciar o serviço</li>
                  <li>Após conclusão, avalie o atendimento no app</li>
                  <li>O pagamento será liberado ao jovem automaticamente</li>
                </ol>
              </div>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://www.impulsojovem.com.br/cliente/agendamentos" class="button">Ver Detalhes do Agendamento</a>
              </p>
            </div>
            <div class="footer">
              <p><strong>Impulso Jovem</strong> - Conectando pessoas e transformando vidas</p>
              <p>Juntos, estamos construindo um futuro melhor para os jovens! 💙</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('✅ Email de jovem aceito enviado para:', clientEmail);
  } catch (error) {
    console.error('❌ Erro ao enviar email de jovem aceito:', error);
  }
};

// Email 3: Agradecimento após Conclusão do Serviço
const sendThankYouEmail = async (clientEmail, clientName, serviceName, jovemName, ongName, rating) => {
  if (!resend) {
    console.log('⚠️ Email desabilitado - RESEND_API_KEY não configurada');
    return;
  }

  try {
    const stars = '⭐'.repeat(rating || 5);
    
    await resend.emails.send({
      from: 'Impulso Jovem <noreply@impulsojovem.com.br>',
      to: [clientEmail],
      subject: '💙 Obrigado por Transformar Vidas - Impulso Jovem',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF6B6B 0%, #C44569 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .impact-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💙 Muito Obrigado!</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${clientName}</strong>!</p>
              
              <p>O serviço "<strong>${serviceName}</strong>" foi concluído com sucesso!</p>
              
              <div class="card">
                <h2 style="color: #667eea; margin-top: 0;">📊 Resumo do Atendimento</h2>
                <p><strong>Serviço:</strong> ${serviceName}</p>
                <p><strong>Jovem:</strong> ${jovemName}</p>
                <p><strong>ONG:</strong> ${ongName}</p>
                ${rating ? `<p><strong>Sua Avaliação:</strong> ${stars}</p>` : ''}
              </div>
              
              <div class="impact-box">
                <h2 style="margin-top: 0; font-size: 28px;">🌟 Você fez a diferença!</h2>
                <p style="font-size: 18px; margin: 15px 0;">
                  Ao contratar ${jovemName}, você ajudou a promover a inclusão social e ofereceu uma oportunidade valiosa de desenvolvimento profissional.
                </p>
                <p style="font-size: 16px; margin: 15px 0;">
                  <strong>Impacto da sua ação:</strong>
                </p>
                <ul style="text-align: left; display: inline-block; font-size: 15px;">
                  <li>✨ Gerou renda para um jovem em formação</li>
                  <li>🎓 Proporcionou experiência profissional real</li>
                  <li>🚀 Contribuiu para a construção de um futuro melhor</li>
                  <li>💪 Fortaleceu a ONG ${ongName}</li>
                  <li>❤️ Ajudou a reduzir desigualdades sociais</li>
                </ul>
              </div>
              
              <div class="card" style="background: #E8F5E9; border-left: 4px solid #4CAF50;">
                <p style="margin: 0; font-size: 16px; text-align: center;">
                  <strong>🙏 Obrigado por acreditar no poder da transformação social!</strong>
                </p>
                <p style="margin: 15px 0 0 0; text-align: center; color: #666;">
                  Cada serviço contratado é uma semente plantada para um futuro mais justo e igualitário.
                </p>
              </div>
              
              <div class="card" style="background: #FFF3E0; border-left: 4px solid #FF9800;">
                <p style="margin: 0;"><strong>💡 Continue Transformando:</strong></p>
                <p style="margin: 10px 0 0 0;">
                  Sempre que precisar de um serviço, lembre-se da Impulso Jovem. 
                  Você estará ajudando mais jovens a conquistarem seu espaço no mercado de trabalho!
                </p>
              </div>
              
              <p style="text-align: center; margin-top: 30px;">
                <a href="https://www.impulsojovem.com.br/cliente/servicos" class="button">Agendar Novo Serviço</a>
              </p>
            </div>
            <div class="footer">
              <p><strong>Impulso Jovem</strong> - Conectando pessoas e transformando vidas</p>
              <p>Juntos, estamos construindo pontes para o futuro! 💙</p>
              <p style="margin-top: 15px; font-size: 11px;">
                Este é um e-mail automático. Por favor, não responda.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('✅ Email de agradecimento enviado para:', clientEmail);
  } catch (error) {
    console.error('❌ Erro ao enviar email de agradecimento:', error);
  }
};

module.exports = {
  sendBookingConfirmation,
  sendJovemAcceptedNotification,
  sendThankYouEmail
};
