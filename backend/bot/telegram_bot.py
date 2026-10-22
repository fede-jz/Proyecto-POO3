#para encenterlo en una tercera terminal ejecutás: python telegram_bot.py
import os
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row

load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]
TELEGRAM_BOT_TOKEN = "TU_TOKEN_DE_BOTFATHER_AQUI" # Reemplazá esto con el token que te da Telegram

async def vincular_comando(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    args = context.args
    
    if not args:
        await update.message.reply_text("⚠️ Por favor ingresá tu código. Ejemplo: /vincular SYS-1234")
        return
        
    codigo_ingresado = args[0].strip()
    
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, nombre FROM usuarios 
                WHERE telegram_cod = %s AND telegram_cod_expira_en > NOW()
                """,
                (codigo_ingresado,)
            )
            usuario = cur.fetchone()
            
            if usuario:
                cur.execute(
                    """
                    UPDATE usuarios 
                    SET telegram_chat_id = %s, telegram_cod = NULL, telegram_cod_expira_en = NULL 
                    WHERE id = %s
                    """,
                    (chat_id, usuario["id"])
                )
                conn.commit()
                await update.message.reply_text(
                    f"✅ ¡Hola {usuario['nombre']}! Tu cuenta de SysMonitor ha sido vinculada exitosamente."
                )
            else:
                await update.message.reply_text(
                    "❌ El código es inválido o ya ha expirado. Generá uno nuevo desde los ajustes de la web."
                )

if __name__ == "__main__":
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(CommandHandler("vincular", vincular_comando))
    print("🤖 Bot de Telegram corriendo y escuchando comandos...")
    app.run_polling()