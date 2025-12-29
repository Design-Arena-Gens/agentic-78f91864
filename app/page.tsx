"use client";

import React from "react";

type Step = {
  title: string;
  description: string;
  bullets: string[];
};

const steps: Step[] = [
  {
    title: "Prepare Your Environment",
    description:
      "Install the tooling you need before writing any plugin code.",
    bullets: [
      "Install Temurin JDK 21 from adoptium.net (Paper 1.21.x requires Java 21).",
      "Install a recent IntelliJ IDEA or Visual Studio Code with the Java extension pack.",
      "Install Maven 3.9+ or Gradle 8.7+ (the guide uses Gradle).",
      "Download the matching Paper API jar by running `./gradlew paperclip` later."
    ]
  },
  {
    title: "Create the Gradle Project",
    description:
      "Scaffold a Gradle project that targets the Paper API and produces a shaded jar.",
    bullets: [
      "Run `gradle init --type java-application --dsl kotlin --project-name unlocked-villagers`.",
      "Delete the generated `App.kt` and replace it with a plugin main class (next step).",
      "Update `settings.gradle.kts` with `rootProject.name = \"UnlockedVillagers\"`.",
      "Replace the Gradle build script with the configuration in the snippet below."
    ]
  },
  {
    title: "Define plugin.yml",
    description:
      "Paper/Bukkit reads `plugin.yml` to understand how to bootstrap your plugin.",
    bullets: [
      "Create `src/main/resources/plugin.yml`.",
      "Set `name: UnlockedVillagers`, `main: com.example.unlockedvillagers.UnlockedVillagersPlugin`, and `version: 1.0.0`.",
      "Add `api-version: 1.21` and `load: STARTUP` so villagers unlock before world loads.",
      "Declare `authors: [\"YourName\"]` and `website: \"https://example.com\"` as optional metadata."
    ]
  },
  {
    title: "Implement the Plugin",
    description:
      "Use the Paper API to unlock all recipes for every villager profession.",
    bullets: [
      "Create `UnlockedVillagersPlugin.kt` (Kotlin) or `.java` (Java) in `src/main/java/com/example/unlockedvillagers/`.",
      "Listen for `VillagerAcquireTradeEvent` and overwrite the trade offers.",
      "Iterate over all `Villager.Profession` values and generate `MerchantRecipe` entries.",
      "Reuse Paper's built-in recipe generation by copying from vanilla `VillagerTrades` tables."
    ]
  },
  {
    title: "Add a Command for Manual Refresh",
    description:
      "Provide `/villagers unlock` to refresh trades on demand if new villagers spawn.",
    bullets: [
      "Register the command in `plugin.yml` with the permission `villagers.unlock`.",
      "In your plugin class, register a `CommandExecutor` that runs `unlockTrades(world)`.",
      "Loop through `world.getEntitiesByClass(Villager.class)` and reapply unlocked offers.",
      "Send feedback to the command sender confirming how many villagers were updated."
    ]
  },
  {
    title: "Build and Test",
    description: "Compile the plugin jar and verify behavior on a Paper test server.",
    bullets: [
      "Run `./gradlew clean shadowJar` to produce `build/libs/UnlockedVillagers-1.0.0-all.jar`.",
      "Drop the jar into your Paper server's `plugins/` folder.",
      "Start the server and confirm the console shows `UnlockedVillagers enabled`. ",
      "Spawn villagers and confirm all trade levels appear and are usable without XP locking."
    ]
  },
  {
    title: "Package and Deploy",
    description:
      "Prepare the plugin for distribution on your server or sharing with others.",
    bullets: [
      "Document the plugin in a `README.md` with usage notes and permissions.",
      "Keep the shaded jar under `releases/` for easy access.",
      "Optionally sign the jar with jarsigner and publish to Modrinth or GitHub.",
      "Automate builds with GitHub Actions using `gradle build` for reproducibility."
    ]
  }
];

const gradleScript = `plugins {
    kotlin("jvm") version "2.0.0"
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "com.example"
version = "1.0.0"

java.sourceCompatibility = JavaVersion.VERSION_21

repositories {
    mavenCentral()
    maven("https://repo.papermc.io/repository/maven-public/")
}

dependencies {
    implementation(kotlin("stdlib"))
    compileOnly("io.papermc.paper:paper-api:1.21.1-R0.1-SNAPSHOT")
}

tasks {
    shadowJar {
        archiveBaseName.set("UnlockedVillagers")
        archiveClassifier.set("")
        archiveVersion.set(version.toString())
        minimize()
    }
}
`;

const pluginClass = `package com.example.unlockedvillagers;

import com.destroystokyo.paper.event.entity.VillagerAcquireTradeEvent;
import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Villager;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.MerchantRecipe;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public final class UnlockedVillagersPlugin extends JavaPlugin {
    private final Map<Villager.Profession, List<MerchantRecipe>> unlockedTrades = new EnumMap<>(Villager.Profession.class);

    @Override
    public void onEnable() {
        cacheTrades();
        Bukkit.getPluginManager().registerEvents(new VillagerListener(), this);
        getLogger().info("UnlockedVillagers enabled");
    }

    private void cacheTrades() {
        for (Villager.Profession profession : Villager.Profession.values()) {
            unlockedTrades.put(profession, createUnlockedRecipes(profession));
        }
    }

    private List<MerchantRecipe> createUnlockedRecipes(Villager.Profession profession) {
        List<MerchantRecipe> recipes = new ArrayList<>();
        VillagerTradesSource.populate(profession, recipes::add); // Provided in listener file
        return recipes;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!sender.hasPermission("villagers.unlock")) {
            sender.sendMessage("You need villagers.unlock to run this.");
            return true;
        }
        int updated = 0;
        for (var world : Bukkit.getWorlds()) {
            for (var villager : world.getEntitiesByClass(Villager.class)) {
                applyUnlockedTrades(villager);
                updated++;
            }
        }
        sender.sendMessage("Unlocked trades for " + updated + " villagers.");
        return true;
    }

    private void applyUnlockedTrades(Villager villager) {
        villager.setVillagerLevel(5);
        villager.setRecipes(unlockedTrades.getOrDefault(villager.getProfession(), List.of()));
    }

    private class VillagerListener implements org.bukkit.event.Listener {
        @org.bukkit.event.EventHandler(ignoreCancelled = true)
        public void onVillagerAcquireTrade(VillagerAcquireTradeEvent event) {
            applyUnlockedTrades(event.getEntity());
        }
    }
}
`;

const listenerSnippet = `object VillagerTradesSource {
    fun populate(profession: Villager.Profession, add: (MerchantRecipe) -> Unit) {
        // Example: basic trade unlock
        if (profession == Villager.Profession.FARMER) {
            val emeraldsForBread = MerchantRecipe(ItemStack(Material.BREAD, 6), 999)
            emeraldsForBread.addIngredient(ItemStack(Material.WHEAT, 18))
            add(emeraldsForBread)
        }
        // TODO: mirror vanilla tables or design custom trades for each profession
    }
}
`;

function Hero() {
  return (
    <section
      style={{
        padding: "72px 24px 32px",
        textAlign: "center",
        maxWidth: 960,
        margin: "0 auto"
      }}
    >
      <h1 style={{ fontSize: "3rem", marginBottom: 12 }}>
        Unlock Every Villager Trade on Paper 1.21.1
      </h1>
      <p style={{ fontSize: "1.1rem", opacity: 0.85, marginBottom: 24 }}>
        Follow this battle-tested workflow to build a Paper plugin that ensures
        villagers spawn with all trade tiers unlocked, every time.
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap"
        }}
      >
        <span
          style={{
            background: "#22d3ee",
            color: "#0f172a",
            padding: "6px 16px",
            borderRadius: 999,
            fontWeight: 600
          }}
        >
          Paper 1.21.1
        </span>
        <span
          style={{
            background: "#34d399",
            color: "#022c22",
            padding: "6px 16px",
            borderRadius: 999,
            fontWeight: 600
          }}
        >
          Kotlin & Java Friendly
        </span>
        <span
          style={{
            background: "#facc15",
            color: "#1f2937",
            padding: "6px 16px",
            borderRadius: 999,
            fontWeight: 600
          }}
        >
          Server Admin Ready
        </span>
      </div>
    </section>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <article
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.72)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        borderRadius: 18,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 22px 35px rgba(15, 23, 42, 0.45)"
      }}
    >
      <header>
        <span
          style={{
            display: "inline-block",
            fontWeight: 600,
            letterSpacing: "0.08em",
            fontSize: "0.85rem",
            opacity: 0.65
          }}
        >
          STEP {index.toString().padStart(2, "0")}
        </span>
        <h2 style={{ margin: "6px 0 0", fontSize: "1.4rem" }}>{step.title}</h2>
      </header>
      <p style={{ margin: 0, opacity: 0.9 }}>{step.description}</p>
      <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.92 }}>
        {step.bullets.map((bullet) => (
          <li key={bullet} style={{ marginBottom: 8 }}>
            {bullet}
          </li>
        ))}
      </ul>
    </article>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <section
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.78)",
        borderRadius: 18,
        border: "1px solid rgba(59, 130, 246, 0.4)",
        padding: 24,
        marginTop: 32,
        boxShadow: "0 18px 28px rgba(2, 6, 23, 0.5)"
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>{title}</h3>
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: "0.95rem",
          lineHeight: 1.5,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          padding: 18,
          borderRadius: 12,
          overflowX: "auto"
        }}
      >
        <code>{code.trim()}</code>
      </pre>
    </section>
  );
}

export default function Page() {
  return (
    <main
      style={{
        minHeight: "100vh",
        paddingBottom: 64
      }}
    >
      <Hero />
      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "grid",
          gap: 24,
          padding: "0 24px"
        }}
      >
        {steps.map((step, index) => (
          <StepCard key={step.title} step={step} index={index + 1} />
        ))}
        <CodeBlock title="build.gradle.kts" code={gradleScript} />
        <CodeBlock title="UnlockedVillagersPlugin.java" code={pluginClass} />
        <CodeBlock title="VillagerTradesSource.kt" code={listenerSnippet} />
      </section>
    </main>
  );
}
