package com.aishop.backend.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Local, conservative whole-message matching; unknown text stays in the normal AI flow. */
final class AiSmallTalk {
    private static final Pattern MARKS = Pattern.compile("\\p{M}+");
    private static final Pattern SPACE = Pattern.compile("[\\s\\p{Z}]+");
    // Only decoration at the end is ignored. Never discard words or internal punctuation.
    private static final Pattern ENDING = Pattern.compile(
            "(?:[\\s\\p{Z}]*[.!?,…]+|[\\s\\p{Z}]*(?::|;|=)-?[)d(]|[\\s\\p{Z}]*[👋😊🙂🙏])+[\\s\\p{Z}]*$");

    private AiSmallTalk() {}

    static String reply(String message) {
        if (message == null) return null;
        String text = message.toLowerCase(Locale.ROOT).replace('đ', 'd');
        text = MARKS.matcher(Normalizer.normalize(text, Normalizer.Form.NFD)).replaceAll("");
        text = SPACE.matcher(text).replaceAll(" ").strip();
        text = ENDING.matcher(text).replaceFirst("").strip();
        return switch (text) {
            case "zdravo" -> "Zdravo! 👋 Kako vam mogu pomoći danas?";
            case "cao" -> "Ćao! Kako vam mogu pomoći?";
            case "hej", "hejj" -> "Hej! Šta vas danas zanima?";
            case "pozdrav" -> "Pozdrav! Kako vam mogu pomoći pri kupovini?";
            case "dobar dan" -> "Dobar dan! Kako vam mogu pomoći pri kupovini?";
            case "dobro jutro" -> "Dobro jutro! Kako vam mogu pomoći danas?";
            case "dobro vece", "dobra vecer" -> "Dobro veče! Kako vam mogu pomoći?";
            case "kako si", "kako ste" -> "Odlično, hvala na pitanju! 😊 Kako vam mogu pomoći?";
            case "sta ima" -> "Tu sam da pomognem! Šta vas zanima?";
            case "hvala", "hvalaa", "hvala ti", "hvala vam", "hvala puno", "super, hvala", "super hvala" ->
                    "Nema na čemu! Ako vam zatreba još nešto, slobodno pitajte.";
            case "nema na cemu" -> "Hvala vam! Tu sam ako vam zatreba pomoć.";
            case "dovidenja" -> "Doviđenja! Želim vam ugodan dan.";
            case "vidimo se" -> "Vidimo se! Tu sam kad vam zatreba pomoć.";
            case "laku noc" -> "Laku noć! Želim vam ugodan odmor.";
            case "ko si ti", "ko si" -> "Ja sam AIShop asistent. Mogu vam pomoći da pronađete proizvode, uporedite opcije i odaberete ono što odgovara vašim potrebama i budžetu.";
            case "sta mozes raditi", "sta mozes", "sta mozes da radis" ->
                    "Mogu vam pomoći da pronađete proizvode iz naše ponude, uporedite njihove karakteristike i pronađete opcije koje odgovaraju vašem budžetu.";
            default -> null;
        };
    }
}
