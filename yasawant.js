document.getElementById("submit-btn").addEventListener("click", () => {
  const textareaValue = document.getElementById("wordbox").value.toLowerCase();
  const parsedData = parseText(textareaValue);
  createTreemap(parsedData);
});

function parseText(text) {
  const charCountMap = {};
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (/[a-z.,!?:;]/.test(char)) {
      charCountMap[char] = (charCountMap[char] || 0) + 1;
    }
  }

  const vowels = { a: 0, e: 0, i: 0, o: 0, u: 0 };
  const consonants = {};
  const punctuation = {};

  for (const [char, count] of Object.entries(charCountMap)) {
    if ("aeiou".includes(char)) vowels[char] = count;
    else if (/[a-z]/.test(char)) consonants[char] = count;
    else punctuation[char] = count;
  }

  return { vowels, consonants, punctuation };
}

function createTreemap(data) {
  const width = 580;
  const height = 400;

  const treemapData = {
    children: [
      {
        name: "Vowels",
        children: Object.entries(data.vowels).map(([key, value]) => ({
          name: key,
          value,
        })),
      },
      {
        name: "Consonants",
        children: Object.entries(data.consonants).map(([key, value]) => ({
          name: key,
          value,
        })),
      },
      {
        name: "Punctuation",
        children: Object.entries(data.punctuation).map(([key, value]) => ({
          name: key,
          value,
        })),
      },
    ],
  };

  const treemap = d3.treemap().size([width, height]).padding(2);

  const root = d3.hierarchy(treemapData).sum((d) => d.value);
  treemap(root);

  const svg = d3
    .select("#treemap_svg")
    .attr("width", width)
    .attr("height", height)
    .append("g");

  const color = d3
    .scaleOrdinal()
    .domain(["Vowels", "Consonants", "Punctuation"])
    .range(["#8dd3c7", "#ffffb3", "#bebada"]);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("background", "white")
    .style("border", "1px solid black")
    .style("border-radius", "5px")
    .style("padding", "5px")
    .style("position", "absolute")
    .style("pointer-events", "none");

  const nodes = svg.selectAll("rect").data(root.leaves());

  nodes
    .enter()
    .append("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", (d) => color(d.parent.data.name))
    .attr("stroke", "black")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "blue").attr("stroke-width", 3);
      updateHighlights(d.data.name); // Highlight in textarea
      createSankey(d.data.name, document.getElementById("wordbox").value);

      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`Character: ${d.data.name}<br>Count: ${d.data.value}`)
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "black").attr("stroke-width", 1);
      clearHighlights();
      tooltip.transition().duration(500).style("opacity", 0);
    });

  nodes
    .enter()
    .append("title")
    .text((d) => `${d.data.name}: ${d.value}`);
}

function createSankey(selectedChar, text) {
  const width = 520;
  const height = 380;

  d3.select("#sankey_svg").selectAll("*").remove();
  d3.select("#flow_label").text(`Character flow for '${selectedChar}'`);

  const beforeCounts = {};
  const afterCounts = {};

  for (let i = 0; i < text.length; i++) {
    const char = text[i].toLowerCase();
    if (char === selectedChar) {
    
      if (i > 0 && /[a-z.,!?:;]/.test(text[i - 1])) {
        const beforeChar = text[i - 1].toLowerCase();
        beforeCounts[beforeChar] = (beforeCounts[beforeChar] || 0) + 1;
      }
    
      if (i < text.length - 1 && /[a-z.,!?:;]/.test(text[i + 1])) {
        const afterChar = text[i + 1].toLowerCase();
        afterCounts[afterChar] = (afterCounts[afterChar] || 0) + 1;
      }
    }
  }

  const nodes = [{ name: selectedChar }];
  const links = [];

  Object.keys(beforeCounts).forEach((char) => {
    nodes.push({ name: char });
    links.push({
      source: nodes.length - 1,
      target: 0,
      value: beforeCounts[char],
    });
  });

  Object.keys(afterCounts).forEach((char) => {
    nodes.push({ name: char });
    links.push({
      source: 0, 
      target: nodes.length - 1,
      value: afterCounts[char],
    });
  });

  const svg = d3
    .select("#sankey_svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(20,0)");


  const sankey = d3
    .sankey()
    .nodeWidth(20)
    .nodePadding(10)
    .extent([
      [1, 1],
      [width - 1, height - 1],
    ]);

  const { nodes: sankeyNodes, links: sankeyLinks } = sankey({
    nodes: nodes.map((d) => Object.assign({}, d)),
    links: links.map((d) => Object.assign({}, d)),
  });

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("background", "white")
    .style("border", "1px solid black")
    .style("border-radius", "5px")
    .style("padding", "5px")
    .style("position", "absolute")
    .style("pointer-events", "none");


  svg
    .append("g")
    .selectAll("path")
    .data(sankeyLinks)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", "#aaa")
    .attr("fill", "none")
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `Character '${nodes[d.source].name}' flows into '${
            nodes[d.target].name
          }' ${d.value} times`
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  const colorMap = {
    vowels: "#8dd3c7",
    consonants: "#ffffb3",
    punctuation: "#bebada",
  };

  const isVowel = (char) => "aeiou".includes(char);
  const isPunctuation = (char) => ".,!?:;".includes(char);

  svg
    .append("g")
    .selectAll("rect")
    .data(sankeyNodes)
    .join("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("fill", (d) => {
      if (isVowel(d.name)) return colorMap.vowels;
      if (isPunctuation(d.name)) return colorMap.punctuation;
      return colorMap.consonants;
    })
    .attr("stroke", "#000")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      let tooltipText;
      if (d.index === 0) {
        tooltipText = `Character '${d.name}' appears ${d.value} times`;
      } else {
        tooltipText = `Character '${d.name}' flows into '${selectedChar}'`;
      }
      tooltip
        .html(tooltipText)
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });
    
  svg
    .append("g")
    .selectAll("text")
    .data(sankeyNodes)
    .enter()
    .append("text")
    .attr("x", (d) => (d.x0 < width / 2 ? d.x0 - 2 : d.x1 + 2)) 
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (d) => (d.x0 < width / 2 ? "end" : "start"))
    .text((d) => d.name)
    .attr("fill", "black");
}

function updateHighlights(char) {
  const text = document.getElementById("wordbox").value;
  const escapedChar = char.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  const highlightedText = text.replace(
    new RegExp(escapedChar, "g"),
    `<mark>${char}</mark>`
  );

  document.querySelector(".highlights").innerHTML = highlightedText;
}

function clearHighlights() {
  document.querySelector(".highlights").innerHTML = "";
}
